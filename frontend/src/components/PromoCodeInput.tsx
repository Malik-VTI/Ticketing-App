import { useState, useEffect } from 'react';
import { pricingAPI, PricingResponse } from '../services/api';

interface PromoCodeInputProps {
  basePrice: number;
  currency: string;
  onPriceCalculated: (pricing: PricingResponse) => void;
  onError: (msg: string) => void;
}

const PromoCodeInput = ({ basePrice, currency, onPriceCalculated, onError }: PromoCodeInputProps) => {
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState<PricingResponse | null>(null);

  useEffect(() => {
    // Initialize or re-calculate when base price changes
    calculatePrice(promoCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePrice]); // Don't include promoCode as dependency otherwise it calculates on every keystroke

  const calculatePrice = async (code: string) => {
    try {
      setLoading(true);
      const data = await pricingAPI.calculatePrice(basePrice, code, currency);
      setPricing(data);
      onPriceCalculated(data);
    } catch (err: any) {
      onError(err.response?.data?.message || 'Failed to calculate price or invalid promo code');
      // Revert to base price calculation (no code)
      const data = await pricingAPI.calculatePrice(basePrice, undefined, currency);
      setPricing(data);
      onPriceCalculated(data);
      setPromoCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) {
      // If empty, just re-calculate without code
      calculatePrice('');
      return;
    }
    calculatePrice(promoCode.trim());
  };

  if (!pricing) return null;

  return (
    <div className="promo-code-container" style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
      <form onSubmit={handleApply} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input 
          type="text" 
          placeholder="Promo Code (e.g. SAVE10)"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          style={{ padding: '0.5rem', flex: 1, borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button 
          type="submit" 
          disabled={loading} 
          style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {loading ? '...' : 'Apply'}
        </button>
      </form>
      
      <div className="pricing-breakdown" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Base Price</span>
          <span>{currency} {pricing.basePrice.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Taxes</span>
          <span>{currency} {pricing.tax.toLocaleString()}</span>
        </div>
        {pricing.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
            <span>Discount (Promo)</span>
            <span>-{currency} {pricing.discount.toLocaleString()}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem', marginTop: '0.5rem', borderTop: '1px solid #eee', paddingTop: '0.5rem' }}>
          <span>Final Total</span>
          <span>{currency} {pricing.totalPrice.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default PromoCodeInput;
