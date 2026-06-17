import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrackingInput } from '../components/TrackingInput';
import { TrackingResult } from '../components/TrackingResult';
import { LogisticsETAForm } from '../components/LogisticsETAForm';
import { OrderLinkForm } from '../components/OrderLinkForm';
import { OrderSummaryCard } from '../components/OrderSummaryCard';
import { ManualShipmentForm } from '../components/ManualShipmentForm';
import { useTracking } from '../hooks/useTracking';
import { useAuth } from '../hooks/useAuth';
import { fetchETA, saveETA } from '../hooks/useLogisticsETA';
import { fetchOrderRefs, saveOrderLink, isOrderReference } from '../hooks/useOrderTrackings';
import { fetchSiblingTrackingNumbers, requestRefresh, fetchTrackingDoc, saveManualShipment } from '../hooks/useTrackingStore';
import { recordSearch } from '../hooks/useSearchHistory';
import { canEditLogistics } from '../types/tracking';
import { Truck, ChevronLeft, ChevronRight, Ship } from 'lucide-react';
import type { TrackingData } from '../types/tracking';

export const SearchView = () => {
  const { user, role } = useAuth();
  const { data: rawData, loading, error, trackShipment, trackByOrder } = useTracking();
  const [enrichedData, setEnrichedData] = useState<TrackingData[] | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingETAIndex, setEditingETAIndex] = useState<number | null>(null);
  const [editingOrderIndex, setEditingOrderIndex] = useState<number | null>(null);
  const [orderSearchRef, setOrderSearchRef] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const lastQuery = useRef<{ query: string; type: 'tracking' | 'order' } | null>(null);
  const [searchParams] = useSearchParams();

  // Enrich con logistics ETA + order refs + grouping desde Firestore
  useEffect(() => {
    if (!rawData) return;
    let cancelled = false;
    const enrich = async () => {
      const siblingCache = new Map<string, string[]>();
      const siblingsOf = async (orderId: string): Promise<string[]> => {
        const key = orderId.toUpperCase();
        if (!siblingCache.has(key)) {
          siblingCache.set(key, await fetchSiblingTrackingNumbers(key).catch(() => []));
        }
        return siblingCache.get(key)!;
      };
      const enriched = await Promise.all(
        rawData.map(async (item) => {
          const [eta, orderRefs] = await Promise.all([
            fetchETA(item.tracking_number).catch(() => null),
            fetchOrderRefs(item.tracking_number).catch(() => null),
          ]);
          let result = item;
          if (eta) result = { ...result, logistics_eta: eta };
          if (orderRefs) result = { ...result, order_references: { ...result.order_references, ...orderRefs } };
          const refs = result.order_references;
          const primaryRef = refs?.sales_order || refs?.purchase_order || refs?.order_confirmation;
          if (primaryRef) {
            const siblings = await siblingsOf(primaryRef);
            if (siblings.length > 0) {
              const idx = siblings.indexOf(item.tracking_number);
              result = {
                ...result,
                shipment_grouping: {
                  order_id: primaryRef.toUpperCase(),
                  shipment_index: idx >= 0 ? idx + 1 : siblings.length,
                  shipment_total: siblings.length,
                },
              };
            }
          }
          return result;
        })
      );
      enriched.sort((a, b) => {
        const aId = a.shipment_grouping?.order_id ?? '';
        const bId = b.shipment_grouping?.order_id ?? '';
        if (aId !== bId) return aId.localeCompare(bId);
        return (a.shipment_grouping?.shipment_index ?? 999) - (b.shipment_grouping?.shipment_index ?? 999);
      });
      if (!cancelled) setEnrichedData(enriched);
    };
    enrich();
    return () => { cancelled = true; };
  }, [rawData]);

  useEffect(() => {
    if (error) {
      alert(error);
      setShowResult(false);
    }
  }, [error]);

  // Registrar la búsqueda en el historial cuando llegan resultados
  useEffect(() => {
    if (rawData && lastQuery.current && user) {
      recordSearch(user.uid, { ...lastQuery.current, result_count: rawData.length });
      lastQuery.current = null;
    }
  }, [rawData, user]);

  const data = enrichedData ?? rawData;

  const handleSearch = async (trackingNumber: string) => {
    lastQuery.current = { query: trackingNumber, type: 'tracking' };
    setOrderSearchRef(null);
    await trackShipment(trackingNumber);
    setShowResult(true);
    setActiveIndex(0);
  };

  const handleSearchByOrder = async (orderRef: string) => {
    lastQuery.current = { query: orderRef.toUpperCase(), type: 'order' };
    setOrderSearchRef(orderRef.toUpperCase());
    await trackByOrder(orderRef);
    setShowResult(true);
    setActiveIndex(0);
  };

  // Repetir búsqueda desde ?q (ej. desde el Historial)
  useEffect(() => {
    const q = searchParams.get('q');
    if (!q) return;
    if (isOrderReference(q)) handleSearchByOrder(q);
    else handleSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleRefresh = async (index: number) => {
    const current = enrichedData ?? rawData;
    const item = current?.[index];
    if (!item) return;
    await requestRefresh(item.tracking_number, item.carrier_info?.slug ?? item.courier_slug);
    await new Promise((r) => setTimeout(r, 4000));
    const fresh = await fetchTrackingDoc(item.tracking_number).catch(() => null);
    if (fresh) {
      setEnrichedData((prev) => {
        const base = prev ?? rawData ?? [];
        const copy = [...base];
        copy[index] = { ...copy[index], ...fresh };
        return copy;
      });
    }
  };

  return (
    <main className="container mx-auto px-4 pt-10 pb-24 relative z-10 flex flex-col items-center">
      {!showResult ? (
        <div className="flex-1 flex flex-col justify-center items-center w-full min-h-[60vh] animate-in fade-in duration-700">
          <div className="mb-8 p-6 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 shadow-2xl">
            <Truck className="w-20 h-20 text-blue-500 opacity-90" strokeWidth={1.5} />
          </div>
          <TrackingInput onSearch={handleSearch} onSearchByOrder={handleSearchByOrder} loading={loading} />
          {role && canEditLogistics(role) && (
            <button
              onClick={() => setShowManualForm(true)}
              className="mt-6 flex items-center gap-2 text-cyan-300/80 hover:text-cyan-200 text-sm font-medium bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-4 py-2 transition-colors"
            >
              <Ship className="w-4 h-4" />
              Add maritime shipment / Envío marítimo
            </button>
          )}
        </div>
      ) : (
        <div className="w-full relative min-h-[80vh] flex flex-col items-center gap-6 pt-16">
          <div className="self-start">
            <button
              onClick={() => setShowResult(false)}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-black/20 hover:bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"
            >
              <Truck className="w-4 h-4" />
              <span className="font-medium text-sm">Track another</span>
            </button>
          </div>

          {orderSearchRef && data && data.length > 0 && (
            <OrderSummaryCard orderRef={orderSearchRef} shipments={data} activeIndex={activeIndex} onSelect={setActiveIndex} />
          )}

          <div className="relative w-full max-w-5xl flex-1 flex justify-center items-start perspective-1000">
            {data && data.map((item, index) => {
              const isSelected = index === activeIndex;
              const offset = index - activeIndex;
              const xOffset = offset * 60;
              const scale = isSelected ? 1 : Math.max(0.85, 1 - Math.abs(offset) * 0.05);
              const zIndex = isSelected ? 50 : 40 - Math.abs(offset);
              const opacity = isSelected ? 1 : Math.max(0.5, 1 - Math.abs(offset) * 0.2);
              const filter = isSelected ? 'none' : 'blur(1px) grayscale(30%)';
              return (
                <div
                  key={item.tracking_number + index}
                  onClick={() => setActiveIndex(index)}
                  className="absolute top-0 w-full flex justify-center transition-all duration-500 ease-out origin-top cursor-pointer"
                  style={{ transform: `translateX(${xOffset}px) scale(${scale})`, zIndex, opacity, filter, pointerEvents: 'auto' }}
                >
                  <div className={`w-full max-w-3xl transition-shadow duration-300 ${isSelected ? 'shadow-2xl' : 'shadow-lg'}`}>
                    <div className={isSelected ? 'pointer-events-auto' : 'pointer-events-none'}>
                      <TrackingResult
                        data={item}
                        role={role}
                        showBackButton={false}
                        onRefresh={isSelected ? () => handleRefresh(index) : undefined}
                        onEditETA={isSelected ? () => setEditingETAIndex(index) : undefined}
                        onLinkOrder={isSelected ? () => setEditingOrderIndex(index) : undefined}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {data && data.length > 1 && (
            <>
              <button
                onClick={() => setActiveIndex((p) => Math.max(0, p - 1))}
                disabled={activeIndex === 0}
                className="fixed left-4 md:left-24 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => setActiveIndex((p) => Math.min(data.length - 1, p + 1))}
                disabled={activeIndex === data.length - 1}
                className="fixed right-4 md:right-10 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {data && data.length > 1 && (
            <div className="fixed bottom-20 md:bottom-8 flex items-center gap-2 z-50">
              {data.map((item, idx) => {
                const prevOrderId = idx > 0 ? data[idx - 1].shipment_grouping?.order_id : undefined;
                const currentOrderId = item.shipment_grouping?.order_id;
                const showSeparator = idx > 0 && currentOrderId && prevOrderId && currentOrderId !== prevOrderId;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    {showSeparator && <div className="w-px h-4 bg-white/20" />}
                    <button
                      onClick={() => setActiveIndex(idx)}
                      className={`h-2 rounded-full transition-all duration-300 shadow-md ${idx === activeIndex ? 'bg-blue-500 w-8' : 'bg-gray-600/50 hover:bg-gray-500 w-2'}`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Logistics ETA Edit Modal */}
      {editingETAIndex !== null && data && data[editingETAIndex] && user?.email && (
        <LogisticsETAForm
          trackingNumber={data[editingETAIndex].tracking_number}
          carrierEta={data[editingETAIndex].eta}
          initial={data[editingETAIndex].logistics_eta}
          onClose={() => setEditingETAIndex(null)}
          onSave={async (etaData) => {
            await saveETA(data[editingETAIndex].tracking_number, etaData, user.email!);
            const updated = [...data];
            const fresh = await fetchETA(data[editingETAIndex].tracking_number);
            if (fresh) updated[editingETAIndex] = { ...updated[editingETAIndex], logistics_eta: fresh };
            setEnrichedData(updated);
          }}
        />
      )}

      {/* Maritime shipment (manual) Modal */}
      {showManualForm && user?.email && (
        <ManualShipmentForm
          onClose={() => setShowManualForm(false)}
          onSave={async (input) => {
            const id = await saveManualShipment(input, user.email!);
            setShowManualForm(false);
            await handleSearch(id);
          }}
        />
      )}

      {/* Order Link Modal */}
      {editingOrderIndex !== null && data && data[editingOrderIndex] && user?.email && (
        <OrderLinkForm
          trackingNumber={data[editingOrderIndex].tracking_number}
          initial={data[editingOrderIndex].order_references}
          onClose={() => setEditingOrderIndex(null)}
          onSave={async (refs) => {
            await saveOrderLink(data[editingOrderIndex].tracking_number, refs, user.email!);
            const updated = [...data];
            const freshRefs = await fetchOrderRefs(data[editingOrderIndex].tracking_number);
            if (freshRefs) {
              updated[editingOrderIndex] = { ...updated[editingOrderIndex], order_references: { ...updated[editingOrderIndex].order_references, ...freshRefs } };
            }
            setEnrichedData(updated);
          }}
        />
      )}
    </main>
  );
};
