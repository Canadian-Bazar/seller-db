export const productStepConfig = {
    product: {
      productInfo: { optional: false },
      attributes:  { optional: false },
      images:      { optional: false },
      pricing:     { optional: false },
      services:    { optional: true }   // ✅ skip when calculating %
    }
   
  };



  export const serviceStepConfig = {
    service: {
      serviceInfo: { optional: false },
      capabilities: { optional: false },
      order: { optional: false },
      pricing: { optional: true },
      customization: { optional: true }, 
      media: { optional: false }         
    }
  };
  