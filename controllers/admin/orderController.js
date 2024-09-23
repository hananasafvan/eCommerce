


const Order = require('../../models/orderSchema');

// Fetch paginated orders and render them on the order list page
const getOrderList = async (req, res) => {
    try {
        const perPage = 3; // Number of orders per page
        const page = parseInt(req.query.page) || 1; // Current page

        // Fetch paginated orders
        const orders = await Order.find({})
            .skip((perPage * page) - perPage)
            .limit(perPage)
            .populate('userId', 'name') // Populate userId with the user's name
            .populate('items.productId', 'name'); // Populate productId with product details

        const totalOrders = await Order.countDocuments();

        res.render('orderList', {
            orders,
            current: page,
            pages: Math.ceil(totalOrders / perPage),
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Change order status
const updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const newStatus = req.body.status;

        await Order.findByIdAndUpdate(orderId, { status: newStatus });
        res.redirect('/admin/orderList');
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Handle order cancellation
const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        console.log('Cancelling Order ID:', orderId); // Log the order ID for debugging
        const updatedOrder = await Order.findByIdAndUpdate(orderId, { status: 'Cancelled' });

        if (!updatedOrder) {
            console.log('Order not found');
            return res.status(404).send('Order not found');
        }

        res.redirect('/admin/orderList');
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).send('Internal Server Error');
    }
};


module.exports = {
    getOrderList,
    updateOrderStatus,
    cancelOrder
};
