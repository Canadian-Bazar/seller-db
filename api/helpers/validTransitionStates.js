    const validTransitions = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['processing', 'cancelled'],
            'processing': ['ready_to_ship', 'cancelled'],
            'ready_to_ship': ['shipped', 'cancelled'],
            'shipped': ['in_transit', 'delivered'],
            'in_transit': ['out_for_delivery', 'delivered'],
            'out_for_delivery': ['delivered', 'returned'],
            'delivered': ['returned'],
            'cancelled': [],
            'returned': []
        };



export default validTransitions
