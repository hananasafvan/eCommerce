const paypal = require("paypal-rest-sdk");
const Order = require("../../models/orderSchema");
const env = require("dotenv").config();

// Configure PayPal
const { PAYPAL_MODE, CLIND_ID, SECRET_ID } = process.env;
paypal.configure({
  mode: PAYPAL_MODE,
  client_id: CLIND_ID,
  client_secret: SECRET_ID,
});

// creating PayPal payment
const payproduct = async (req, res) => {
  try {
    const create_payment_json = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: "http://localhost:3000/success",
        cancel_url: "http://localhost:3000/cancel",
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

//successful payment

const successPage = async (req, res) => {
  try {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;

    if (!payerId || !paymentId) {
      return res.status(400).send("Payment ID or Payer ID not provided.");
    }

    const orderId = req.query.orderId;
    if (!orderId) {
      return res.status(400).send("Order ID not provided.");
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send("Order not found.");
    }

    const items = order.items.map((item) => ({
      name: item.productId.productName,
      sku: item.productId._id,
      price: (item.totalPrice / 84.1).toFixed(2),
      currency: "USD",
      quantity: item.quantity,
    }));

    const totalAmount = items
      .reduce((acc, item) => acc + parseFloat(item.price) * item.quantity, 0)
      .toFixed(2);

    const execute_payment_json = {
      payer_id: payerId,
      transactions: [
        {
          item_list: {
            items: items,
          },
          amount: {
            currency: "USD",
            total: totalAmount,
          },
          description: "Thank you for your purchase!",
        },
      ],
    };

    paypal.payment.execute(
      paymentId,
      execute_payment_json,
      function (error, payment) {
        if (error) {
          console.error("PayPal Payment Execution Error:", error.response);
          return res.status(500).send("Payment execution failed");
        } else {
          console.log("Payment successful:", JSON.stringify(payment));
          res.render("confirm-cod");
        }
      }
    );
  } catch (error) {
    console.error("Error processing PayPal success callback:", error.message);
    res.status(500).send("Error processing PayPal success callback");
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
