import express from 'express';

const router = express.Router();

// GET /api/snacks
// Returns an empty array to allow the mobile app to fall back to its internal static menu.
// If you add a DB model for snacks later, query it here.
router.get('/', (req, res) => {
  res.json([]);
});

// POST /api/snacks/order
// Processes the snack cart and returns a mocked order ID.
router.post('/order', (req, res) => {
  try {
    const { cart, total, timestamp } = req.body;

    if (!cart || Object.keys(cart).length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Generate a mock order ID
    const orderId = `SNK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Optional: Log the order for debugging
    console.log(`[Snacks API] New order received: ${orderId}, Total: ₪${total}`);

    return res.status(200).json({
      success: true,
      orderId,
      message: 'Snack order placed successfully'
    });
  } catch (error) {
    console.error('Error processing snack order:', error);
    return res.status(500).json({ success: false, message: 'Server error processing order' });
  }
});

export default router;
