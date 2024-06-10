const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const sequelize = require('./models');
const transactionRoutes = require('./routes/transactions');

const app = express();
app.use(bodyParser.json());

app.use('/transactions', transactionRoutes);

const PORT = process.env.PORT || 3000;
sequelize.sync().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Unable to connect to the database:', err);
});
