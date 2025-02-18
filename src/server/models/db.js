import { Sequelize } from 'sequelize';



// Option 2: Passing parameters separately (sqlite)

const DB  =  new Sequelize({
  dialect: 'sqlite',
  storage: '.db.sqlite'
});

async function testConnection(){
    try {
        await DB.authenticate();
        console.log('Connection has been established successfully.');
      } catch (error) {
        console.error('Unable to connect to the database:', error);
      }
}

testConnection()
export {BD}