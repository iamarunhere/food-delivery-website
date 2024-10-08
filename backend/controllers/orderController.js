import Stripe from "stripe";
import Order from "../model/orderModel.js";
import User from "../model/userModel.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
//placing user order from frontend

const placeOrder = async (req, res) => {
  const frontend_url = "https://food-website-by-arunkumar.onrender.com";
  try {
    const newOrder = new Order({
      userId: req.body.userId,
      items: req.body.items,
      amount: req.body.amount,
      address: req.body.address,
    });

    await newOrder.save();
    await User.findByIdAndUpdate(req.body.userId, { cartData: {} });

    const line_items = req.body.items.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: {
          name: item.name,
        },
        unit_amount: item.price * 100,
      },
      quantity: 1,
    }));
    line_items.push({
      price_data: {
        currency: "inr",
        product_data: {
          name: "Delivery Charges",
        },
        unit_amount: 80 * 100,
      },
      quantity: 1,
    });
    const session = await stripe.checkout.sessions.create({
      line_items: line_items,
      mode: "payment",
      success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`,
    });
    res.json({
      success: true,
      session_url: session.url,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error in orderController" });
  }
};

const verifyOrder = async (req, res) => {
  const { orderId, success } = req.body;
  const token = req.headers;
  if (!token) {
    return res.json({
      success: false,
      message: "Token missing",
    });
  }

  try {
    if (success === "true") {
      await Order.findByIdAndUpdate(orderId, { payment: true });
      res.json({
        success: true,
        message: "Paid",
      });
    } else {
      await Order.findByIdAndDelete(orderId);
      res.json({ success: false, message: "Not paid" });
    }
  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: error,
    });
  }
};

//user orders for frontend
const userOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.body.userId });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error in retrieving users orders" });
  }
};

//Listing orders for admin panel

const listOrders = async (req, res) => {
  try {
    const orders = await Order.find({});
    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({
      ssuccess: false,
      message: "Error is listing orders in admin panel",
    });
  }
};

//api for updating order status
const updateOrderStatus = async (req, res) => {
  try {
    await Order.findByIdAndUpdate(req.body.orderId, {
      status: req.body.status,
    });
    res.json({ success: true, message: "Status updated successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error updating status of order" });
  }
};

export { placeOrder, verifyOrder, userOrders, listOrders, updateOrderStatus };
