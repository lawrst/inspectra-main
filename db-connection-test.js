// Script para testar a conexão com o MongoDB
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Função para testar a conexão
async function testConnection() {
  console.log("Testando conexão com o MongoDB...");
  console.log(
    "String de conexão:",
    process.env.BANCODEDADOS.replace(/:([^:@]+)@/, ":****@")
  );

  try {
    await mongoose.connect(process.env.BANCODEDADOS, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout curto para teste
    });

    console.log("✅ Conexão bem-sucedida!");
    console.log("Estado da conexão:", mongoose.connection.readyState);
    console.log(
      "Versão do MongoDB:",
      mongoose.connection.db.serverConfig.s.options.serverApi?.version ||
        "Desconhecida"
    );

    // Testar operação de escrita
    const TestModel = mongoose.model(
      "ConnectionTest",
      new mongoose.Schema({
        test: String,
        timestamp: { type: Date, default: Date.now },
      })
    );

    const testDoc = new TestModel({ test: "Teste de conexão" });
    await testDoc.save();
    console.log("✅ Operação de escrita bem-sucedida!");

    // Limpar o documento de teste
    await TestModel.deleteOne({ _id: testDoc._id });
    console.log("✅ Operação de limpeza bem-sucedida!");

    // Fechar a conexão
    await mongoose.connection.close();
    console.log("Conexão fechada.");

    return true;
  } catch (error) {
    console.error("❌ Erro na conexão:", error.message);

    if (error.name === "MongoServerSelectionError") {
      console.error("Detalhes do erro de seleção do servidor:", error.reason);
    }

    // Verificar problemas comuns
    if (error.message.includes("ECONNREFUSED")) {
      console.error(
        "O servidor MongoDB não está acessível. Verifique se o serviço está em execução."
      );
    } else if (error.message.includes("Authentication failed")) {
      console.error(
        "Falha na autenticação. Verifique o nome de usuário e senha."
      );
    } else if (error.message.includes("ETIMEDOUT")) {
      console.error("Timeout na conexão. Verifique a rede e o firewall.");
    }

    return false;
  }
}

// Executar o teste
testConnection().then((success) => {
  if (success) {
    console.log("Teste de conexão concluído com sucesso.");
  } else {
    console.log("Teste de conexão falhou. Verifique os erros acima.");
    process.exit(1);
  }
});

// Executar o teste quando este script for chamado diretamente
if (require.main === module) {
  testConnection();
}
