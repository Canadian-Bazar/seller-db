import { ProductMonthlyAnalytics, ProductYearlyAnalytics } from '../models/product-analytics.schema.js';
import moment from 'moment';



const getYearlySalesData = async (productIds, fromDate, toDate, type = 'salesCount') => {


  // Validate type parameter
  const validTypes = ['salesCount', 'salesAmount', 'profit'];
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

  // Query yearly analytics documents
  const query = { year: { $in: yearRange } };

  if (productIds && productIds.length > 0) {
    query.productId = { $in: productIds };
  }

  const yearlyDocs = await ProductYearlyAnalytics.find(query);

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

  return { x, y };
};



export default getYearlySalesData;