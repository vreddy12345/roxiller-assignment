const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});

const ProductTransaction = sequelize.define('ProductTransaction', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING },
  description: { type: DataTypes.STRING },
  price: { type: DataTypes.FLOAT },
  dateOfSale: { type: DataTypes.DATE },
  sold: { type: DataTypes.BOOLEAN },
  category: { type: DataTypes.STRING },
});

module.exports = sequelize;
module.exports.ProductTransaction = ProductTransaction;
