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
        const lightsCollection = client.db("screwBeat").collection("lights");
        const reviewsCollection = client.db("screwBeat").collection("reviews");
        const ordersCollection = client.db("screwBeat").collection("orders");
        const myProfileCollection = client.db("screwBeat").collection("myProfile");
        const paymentCollection = client.db("screwBeat").collection("payment");
        const usersCollection = client.db("screwBeat").collection("users");
        const shopCollection = client.db("screwBeat").collection("shop");

        
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

        app.get('/lights', async (req, res) => {
            const query = {};
            const cursor = lightsCollection.find(query);
            const lights = await cursor.toArray();
            res.send(lights);
        });

        app.get('/lights/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const tool = await lightsCollection.findOne(query);
            res.send(tool);
        })

        app.get('/shop', async (req, res) => {
            const limit = Number(req.query.limit)
            const pageNumber = Number(req.query.pageNumber)
            const cursor = shopCollection.find();
            const shop = await cursor.skip(limit * pageNumber).limit(limit).toArray();
            res.send(shop);
        });

        app.get('/shop/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const shop = await shopCollection.findOne(query);
            res.send(shop);
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
        });

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
          })
      
        app.put('/users/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        });
        
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
        
        app.put('/myProfile/:email', async (req, res) => {
            const email = req.params.email;
            const updateProfile= req.body;
            const filter = { email: email };
            console.log(updateProfile);
            const options = { upsert: true };
            const updatedDoc = {
                $set: updateProfile
            };
            const result = await myProfileCollection.updateOne(filter, updatedDoc, options);
            res.send({ result });

        });

        app.post('/create-payment-intent', async (req, res) => {
            const lights = req.body;
            const price = lights.price;
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

        app.post('/lights', async (req, res) => {
            const newProducts = req.body;
            const result = await lightsCollection.insertOne(newProducts);
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

        app.delete('/lights/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await lightsCollection.deleteOne(query);
            res.send(result);
        });


    } finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('OutLight is running')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})