const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Op } = require('sequelize');
const { ProductTransaction } = require('../models');

// Initialize and seed database
router.get('/initialize', async (req, res) => {
    try {
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const data = response.data;
        await ProductTransaction.sync({ force: true });
        await ProductTransaction.bulkCreate(data);
        res.status(200).json({ message: 'Database initialized with seed data' });
    } catch (error) {
        res.status(500).json({ error: 'Error initializing database' });
    }
});

// List transactions with search and pagination
router.get('/', async (req, res) => {
    const { month, search, page = 1, perPage = 10 } = req.query;
    const offset = (page - 1) * perPage;

    let whereClause = {};
    if (month) {
        whereClause.dateOfSale = {
            [Op.like]: `%-${month.toString().padStart(2, '0')}-%`
        };
    }
    if (search) {
        whereClause = {
            ...whereClause,
            [Op.or]: [
                { title: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } },
                { price: { [Op.like]: `%${search}%` } }
            ]
        };
    }

    try {
        const transactions = await ProductTransaction.findAndCountAll({
            where: whereClause,
            limit: parseInt(perPage),
            offset: offset
        });

        res.status(200).json({
            transactions: transactions.rows,
            total: transactions.count,
            page: parseInt(page),
            perPage: parseInt(perPage)
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching transactions' });
    }
});

// Statistics API
router.get('/statistics', async (req, res) => {
    const { month } = req.query;

    if (!month) {
        return res.status(400).json({ error: 'Month is required' });
    }

    try {
        const totalSaleAmount = await ProductTransaction.sum('price', {
            where: { dateOfSale: { [Op.like]: `%-${month.toString().padStart(2, '0')}-%` }, sold: true }
        });
        const totalSoldItems = await ProductTransaction.count({
            where: { dateOfSale: { [Op.like]: `%-${month.toString().padStart(2, '0')}-%` }, sold: true }
        });
        const totalNotSoldItems = await ProductTransaction.count({
            where: { dateOfSale: { [Op.like]: `%-${month.toString().padStart(2, '0')}-%` }, sold: false }
        });

        res.status(200).json({
            totalSaleAmount,
            totalSoldItems,
            totalNotSoldItems
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching statistics' });
    }
});

// Bar chart data API
router.get('/barchart', async (req, res) => {
    const { month } = req.query;

    if (!month) {
        return res.status(400).json({ error: 'Month is required' });
    }

    const priceRanges = [
        { range: '0-100', min: 0, max: 100 },
        { range: '101-200', min: 101, max: 200 },
        { range: '201-300', min: 201, max: 300 },
        { range: '301-400', min: 301, max: 400 },
        { range: '401-500', min: 401, max: 500 },
        { range: '501-600', min: 501, max: 600 },
        { range: '601-700', min: 601, max: 700 },
        { range: '701-800', min: 701, max: 800 },
        { range: '801-900', min: 801, max: 900 },
        { range: '901-above', min: 901, max: Infinity }
    ];

    try {
        const barChartData = await Promise.all(priceRanges.map(async (range) => {
            const count = await ProductTransaction.count({
                where: {
                    dateOfSale: { [Op.like]: `%-${month.toString().padStart(2, '0')}-%` },
                    price: { [Op.between]: [range.min, range.max] }
                }
            });
            return { range: range.range, count };
        }));

        res.status(200).json(barChartData);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching bar chart data' });
    }
});

// Pie chart data API
router.get('/piechart', async (req, res) => {
    const { month } = req.query;

    if (!month) {
        return res.status(400).json({ error: 'Month is required' });
    }

    try {
        const categories = await ProductTransaction.findAll({
            attributes: ['category', [sequelize.fn('COUNT', sequelize.col('category')), 'count']],
            where: { dateOfSale: { [Op.like]: `%-${month.toString().padStart(2, '0')}-%` } },
            group: ['category']
        });

        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching pie chart data' });
    }
});

// Combined data API
router.get('/combined', async (req, res) => {
    const { month } = req.query;

    if (!month) {
        return res.status(400).json({ error: 'Month is required' });
    }

    try {
        const [transactions, statistics, barChart, pieChart] = await Promise.all([
            ProductTransaction.findAll({
                where: { dateOfSale: { [Op.like]: `%-${month.toString().padStart(2, '0')}-%` } }
            }),
            sequelize.query(`
                SELECT SUM(price) as totalSaleAmount, COUNT(CASE WHEN sold = 1 THEN 1 END) as totalSoldItems, COUNT(CASE WHEN sold = 0 THEN 1 END) as totalNotSoldItems
                FROM ProductTransactions
                WHERE dateOfSale LIKE '%-${month.toString().padStart(2, '0')}-%'
            `, { type: sequelize.QueryTypes.SELECT }),
            Promise.all(priceRanges.map(async (range) => {
                const count = await ProductTransaction.count({
                    where: {
                        dateOfSale: { [Op.like]: `%-${month.toString().padStart(2, '0')}-%` },
                        price: { [Op.between]: [range.min, range.max] }
                    }
                });
                return { range: range.range, count };
            })),
            ProductTransaction.findAll({
                attributes: ['category', [sequelize.fn('COUNT', sequelize.col('category')), 'count']],
                where: { dateOfSale: { [Op.like]: `%-${month.toString().padStart(2, '0')}-%` } },
                group: ['category']
            })
        ]);

        res.status(200).json({
            transactions,
            statistics: statistics[0],
            barChart,
            pieChart
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching combined data' });
    }
});

module.exports = router;
