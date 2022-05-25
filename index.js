const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.pwa7ybe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: 'Forbidden access' })
      }
      req.decoded = decoded;
      next();
    });
}
  
async function run() {
    try {
        await client.connect();
        const toolsCollection = client.db("screwBeat").collection("tools");
        const reviewsCollection = client.db("screwBeat").collection("reviews");
        const ordersCollection = client.db("screwBeat").collection("orders");
        const myProfileCollection = client.db("screwBeat").collection("myProfile");
        const paymentCollection = client.db("screwBeat").collection("payment");
        const usersCollection = client.db("screwBeat").collection("users");

        
    const verifyAdmin = async (req, res, next) => {
        const requester = req.decoded.email;
        const requesterAccount = await usersCollection.findOne({ email: requester });
        if (requesterAccount.role === 'admin') {
          next();
        }
        else {
          res.status(403).send({ message: 'forbidden' });
        }
      }

        app.get('/tools', async (req, res) => {
            const query = {};
            const cursor = toolsCollection.find(query);
            const tools = await cursor.toArray();
            res.send(tools);
        });

        app.get('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const tool = await toolsCollection.findOne(query);
            res.send(tool);
        })

        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewsCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        });
        app.get('/orders', async (req, res) => {
            const query = {};
            const cursor = ordersCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        });

        app.get('/users',  async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
          });

        app.get('/myOrders', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const cursor = ordersCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        });

        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const tool = await ordersCollection.findOne(query);
            res.send(tool);
        });

        app.get('/myProfile', async (req, res) => {
            const query = {};
            const cursor = myProfileCollection.find(query);
            const myProfile = await cursor.toArray();
            res.send(myProfile);
        });;

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
          })
      
          app.put('/users/admin/:email',verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
              $set: { role: 'admin' },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
          })
        
        app.patch('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }

            const result = await paymentCollection.insertOne(payment);
            const updatedBooking = await ordersCollection.updateOne(filter, updatedDoc);
            res.send(updatedBooking);
        });

        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
              $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
          });

        app.post('/create-payment-intent', async (req, res) => {
            const tools = req.body;
            const price = tools.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });

        app.post('/orders', async (req, res) => {
            const newOrders = req.body;
            const result = await ordersCollection.insertOne(newOrders);
            res.send(result);
        });

        app.post('/reviews', async (req, res) => {
            const newReviews = req.body;
            const result = await reviewsCollection.insertOne(newReviews);
            res.send(result);
        });

        app.post('/tools', async (req, res) => {
            const newProducts = req.body;
            const result = await toolsCollection.insertOne(newProducts);
            res.send(result);

        });
        app.post('/myProfile', async (req, res) => {
            const myProfile = req.body;
            const result = await myProfileCollection.insertOne(myProfile);
            res.send(result);

        });

        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        });

        app.delete('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await toolsCollection.deleteOne(query);
            res.send(result);
        });

    } finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Screwbeat is running')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})