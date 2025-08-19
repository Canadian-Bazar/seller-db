export const stepConfig = {
    product: {
      productInfo: { optional: false },
      attributes:  { optional: false },
      images:      { optional: false },
      pricing:     { optional: false },
      services:    { optional: true }   // ✅ skip when calculating %
    }
   
  };
  