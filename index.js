const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.pwa7ybe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const toolsCollection = client.db("screwBeat").collection("tools");
        console.log('db conected')
        
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