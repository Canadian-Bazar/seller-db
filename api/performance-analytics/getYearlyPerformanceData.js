import { ProductMonthlyPerformance, ProductYearlyPerformance } from '../models/product-performance-analytics.schema.js';
import moment from 'moment';


export const getYearlyPerformanceData = async (productIds, fromDate, toDate, type = 'viewCount') => {
  console.log('📅 Getting yearly performance data:', { 
    productIds, 
    fromDate: fromDate.format(), 
    toDate: toDate.format(), 
    type 
  });

  // Validate type parameter
  const validTypes = ['viewCount', 'quotationsSent', 'quotationsAccepted', 'quotationsRejected', 'quotationsInProgress', 'popularityScore', 'bestsellerScore'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  const x = []; // Year labels
  const y = []; // Values based on type

  // Generate year range
  const yearRange = [];
  for (let year = fromDate.year(); year <= toDate.year(); year++) {
    yearRange.push(year);
  }

  // Query yearly performance documents
  const query = { year: { $in: yearRange } };

  if (productIds && productIds.length > 0) {
    query.productId = { $in: productIds };
  }

  const yearlyDocs = await ProductYearlyPerformance.find(query);

  // Extract yearly data
  for (const year of yearRange) {
    let totalValue = 0;

    // Sum values across all products for this year
    const relevantDocs = yearlyDocs.filter(doc => doc.year === year);
    for (const doc of relevantDocs) {
      totalValue += doc.yearlyTotals[type] || 0; // Use dynamic type
    }

    x.push(year.toString());
    y.push(totalValue);
  }

  console.log(`📊 Yearly ${type} result:`, { x, y });
  return { x, y };
};


export default getYearlyPerformanceData;