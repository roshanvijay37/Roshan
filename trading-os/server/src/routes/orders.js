import express from "express";
import { requireAuth } from "./auth.js";

const router = express.Router();

// Place a real order through Zerodha
router.post("/place", requireAuth, async (req, res) => {
  const {
    tradingsymbol,
    exchange = "NSE",
    transaction_type, // BUY or SELL
    quantity,
    order_type = "MARKET", // MARKET, LIMIT, SL, SL-M
    product = "CNC", // CNC (delivery), MIS (intraday), NRML (F&O)
    price = 0,
    trigger_price = 0,
    variety = "regular", // regular, amo, bo, co
  } = req.body;

  // Validate required fields
  if (!tradingsymbol || !transaction_type || !quantity) {
    return res.status(400).json({
      error: "tradingsymbol, transaction_type, and quantity are required",
    });
  }

  // Validate transaction type
  if (!["BUY", "SELL"].includes(transaction_type)) {
    return res.status(400).json({
      error: "transaction_type must be BUY or SELL",
    });
  }

  try {
    const orderParams = {
      tradingsymbol: tradingsymbol.toUpperCase(),
      exchange: exchange.toUpperCase(),
      transaction_type: transaction_type.toUpperCase(),
      quantity: parseInt(quantity),
      order_type: order_type.toUpperCase(),
      product: product.toUpperCase(),
      variety: variety.toLowerCase(),
    };

    // Add price for limit orders
    if (["LIMIT", "SL", "SL-M"].includes(orderParams.order_type)) {
      if (!price || price <= 0) {
        return res.status(400).json({
          error: "Price is required for LIMIT/SL/SL-M orders",
        });
      }
      orderParams.price = parseFloat(price);
    }

    // Add trigger price for SL orders
    if (["SL", "SL-M"].includes(orderParams.order_type)) {
      if (!trigger_price || trigger_price <= 0) {
        return res.status(400).json({
          error: "trigger_price is required for SL/SL-M orders",
        });
      }
      orderParams.trigger_price = parseFloat(trigger_price);
    }

    const response = await req.kite.placeOrder(variety, orderParams);

    res.json({
      success: true,
      orderId: response.order_id,
      status: "placed",
      details: orderParams,
    });
  } catch (error) {
    console.error("Order placement error:", error);
    res.status(400).json({
      error: "Failed to place order",
      message: error.message,
    });
  }
});

// Cancel an order
router.delete("/cancel/:orderId", requireAuth, async (req, res) => {
  const { orderId } = req.params;
  const { variety = "regular" } = req.body;

  try {
    const response = await req.kite.cancelOrder(variety, orderId);
    res.json({
      success: true,
      orderId: response.order_id,
      status: "cancelled",
    });
  } catch (error) {
    console.error("Order cancellation error:", error);
    res.status(400).json({
      error: "Failed to cancel order",
      message: error.message,
    });
  }
});

// Get order history
router.get("/history", requireAuth, async (req, res) => {
  try {
    const orders = await req.kite.getOrders();
    res.json({ orders });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(400).json({
      error: "Failed to fetch orders",
      message: error.message,
    });
  }
});

// Get order details
router.get("/:orderId", requireAuth, async (req, res) => {
  try {
    const order = await req.kite.getOrderHistory(req.params.orderId);
    res.json({ order });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(400).json({
      error: "Failed to fetch order",
      message: error.message,
    });
  }
});

// Get trades for the day
router.get("/trades/today", requireAuth, async (req, res) => {
  try {
    const trades = await req.kite.getTrades();
    res.json({ trades });
  } catch (error) {
    console.error("Get trades error:", error);
    res.status(400).json({
      error: "Failed to fetch trades",
      message: error.message,
    });
  }
});

export default router;