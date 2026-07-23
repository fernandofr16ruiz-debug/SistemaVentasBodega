require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`==============================================`);
    console.log(`🚀 Servidor API REST corriendo en el puerto ${PORT}`);
    console.log(`📦 Entorno local configurado correctamente`);
    console.log(`==============================================`);
});