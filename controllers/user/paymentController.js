const paypal = require("paypal-rest-sdk");
const Order = require("../../models/orderSchema");
const env = require("dotenv").config();
const Cart = require("../../models/cartSchema");

const { PAYPAL_MODE, CLIND_ID, SECRET_ID } = process.env;
paypal.configure({
  mode: PAYPAL_MODE,
  client_id: CLIND_ID,
  client_secret: SECRET_ID,
});

const payproduct = async (req, res) => {
  try {
    const create_payment_json = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: "http://nidha.live/success",
        cancel_url: "http://nidha.live/cancel",
      },
      transactions: [
        {
          item_list: {
            items: [
              {
                name: "book",
                sku: "001",
                price: "25.00",
                currency: "USD",
                quantity: 1,
              },
            ],
          },
          amount: {
            currency: "USD",
            total: "25.00",
          },
          description: "Thank you for your purchase!",
        },
      ],
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
        throw error;
      } else {
        for (let i = 0; i < payment.links.length; i++) {
          if (payment.links[i].rel === "approval_url") {
            return res.redirect(payment.links[i].href);
          }
        }
      }
    });
  } catch (error) {
    console.error("PayPal Payment Error:", error.message);
    res.status(500).send("Error processing PayPal payment");
  }
};

const successPage = async (req, res) => {
  const { paymentId, PayerID, orderId } = req.query;

  try {
    const execute_payment_json = { payer_id: PayerID };

    paypal.payment.execute(
      paymentId,
      execute_payment_json,
      async (error, payment) => {
        if (error) {
          console.error("PayPal Execute Error:", error);
          return res.status(500).send("Payment execution failed.");
        } else {
          console.log("Payment successful!");

          const order = await Order.findById(orderId);
          if (!order) {
            return res.status(404).send("Order not found.");
          }

          order.orderStatus = "Processing";
          order.items.forEach((item) => {
            item.status = "Paid";
          });
          await order.save();

          await Cart.findOneAndDelete({ userId: order.userId });

          return res.render("confirm-cod", { orderId });
        }
      }
    );
  } catch (error) {
    console.error("Error processing PayPal success:", error);
    return res.status(500).send("Internal server error");
  }
};

const cancelPage = async (req, res) => {
  try {
    res.render("cancel");
  } catch (error) {
    console.error("Error rendering cancel page:", error.message);
    res.status(500).send("Error rendering cancel page");
  }
};

module.exports = {
  payproduct,
  successPage,
  cancelPage,
};
