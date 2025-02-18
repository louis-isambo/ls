import {  DataTypes, Model }  from 'sequelize'
import {DB} from "./db.js"



const leisTemplate = DB.define(
  'Template',
  {

    name : {
      type: DataTypes.STRING,
     
    },
    type: {
      type: DataTypes.STRING,
     
    },
  }  
);

const leisDesign  = DB.define(
    'Design',
    {
        name : {
            type : DataTypes.STRING,
        },
        type : {
            type : DataTypes.STRING,
        },
        idTemplate  : {
            type : DataTypes.STRING,
        },
        content : {
            type : DataTypes.STRING,
        },
    }
)

const leisAsset = DB.define(
    'Asset',
    {
        name : {
            type : DataTypes.STRING,
        },
        type : {
            type : DataTypes.STRING,
        },
        idTemplate  : {
            type : DataTypes.STRING,
        },
        size : {
            type : DataTypes.STRING,
        },
        originName : {
            type : DataTypes.STRING,
        },
    }
)

// synchronize all tables 

 async function leisSynch(){
    await DB.sync();
    console.log('All models were synchronized successfully.');
 }

module.exports = {
   leisTemplate,
   leisDesign,
   leisAsset,
   leisSynch
}