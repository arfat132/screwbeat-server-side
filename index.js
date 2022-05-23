const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000;

require('dotenv').config()

//middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://dbUser:<password>@cluster0.pwa7ybe.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(err => {
  const collection = client.db("test").collection("devices");
  console.log('db conected')
  client.close();
});

app.get('/', (req, res) => {
  res.send('Screwbeat is running')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})