// Script para verificar e reconectar ao MongoDB
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Configurações de conexão com retry automático
const connectWithRetry = () => {
  console.log("Tentando conectar ao MongoDB...");

  mongoose
    .connect(process.env.BANCODEDADOS, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
    })
    .then(() => {
      console.log("MongoDB conectado com sucesso!");
    })
    .catch((err) => {
      console.error("Falha ao conectar ao MongoDB:", err.message);
      console.log("Tentando reconectar em 5 segundos...");
      setTimeout(connectWithRetry, 5000);
    });
};

// Monitorar eventos de conexão
mongoose.connection.on("connected", () => {
  console.log("Mongoose conectado ao MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("Erro na conexão Mongoose:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose desconectado do MongoDB");
  connectWithRetry();
});

// Iniciar conexão
connectWithRetry();

// Verificar a conexão periodicamente
setInterval(() => {
  if (mongoose.connection.readyState !== 1) {
    console.log(
      "Conexão MongoDB perdida. Estado atual:",
      mongoose.connection.readyState
    );
    console.log("Tentando reconectar...");
    connectWithRetry();
  } else {
    console.log("Conexão MongoDB OK. Estado:", mongoose.connection.readyState);
  }
}, 30000); // Verificar a cada 30 segundos

// Exportar para uso em outros arquivos
export default mongoose;
