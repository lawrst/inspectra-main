// Sistema de armazenamento local para pesos quando o MongoDB falhar
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Configuração para __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho para o arquivo de armazenamento local
const STORAGE_FILE = path.join(__dirname, "local-weights.json");

// Classe para gerenciar o armazenamento local
class LocalWeightStorage {
  constructor() {
    this.weights = [];
    this.loadFromFile();
  }

  // Carregar pesos do arquivo local
  loadFromFile() {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const data = fs.readFileSync(STORAGE_FILE, "utf8");
        this.weights = JSON.parse(data);
        console.log(
          `Carregados ${this.weights.length} pesos do armazenamento local`
        );
      } else {
        console.log(
          "Arquivo de armazenamento local não encontrado, criando novo"
        );
        this.weights = [];
        this.saveToFile();
      }
    } catch (error) {
      console.error("Erro ao carregar pesos do arquivo local:", error);
      this.weights = [];
    }
  }

  // Salvar pesos no arquivo local
  saveToFile() {
    try {
      fs.writeFileSync(
        STORAGE_FILE,
        JSON.stringify(this.weights, null, 2),
        "utf8"
      );
      console.log(`Salvos ${this.weights.length} pesos no armazenamento local`);
    } catch (error) {
      console.error("Erro ao salvar pesos no arquivo local:", error);
    }
  }

  // Adicionar um novo peso
  addWeight(weightData) {
    // Adicionar ID local e timestamp se não existirem
    const localWeight = {
      ...weightData,
      id: weightData.id || `local_${Date.now()}`,
      timestamp: weightData.timestamp || new Date().toISOString(),
    };

    // Adicionar ao início do array
    this.weights.unshift(localWeight);

    // Limitar o tamanho do armazenamento local (manter apenas os 50 mais recentes)
    if (this.weights.length > 50) {
      this.weights = this.weights.slice(0, 50);
    }

    // Salvar no arquivo
    this.saveToFile();

    return localWeight;
  }

  // Obter todos os pesos
  getAllWeights() {
    return this.weights;
  }

  // Obter os pesos mais recentes (limitado)
  getRecentWeights(limit = 10) {
    return this.weights.slice(0, limit);
  }

  // Limpar todos os pesos
  clearWeights() {
    this.weights = [];
    this.saveToFile();
  }

  // Sincronizar com o MongoDB quando estiver disponível
  async syncWithMongoDB(mongoModel) {
    if (!this.weights.length) {
      console.log("Nenhum peso local para sincronizar");
      return { synced: 0 };
    }

    console.log(
      `Tentando sincronizar ${this.weights.length} pesos com MongoDB`
    );

    let syncedCount = 0;
    let failedCount = 0;

    // Copiar o array para não modificar durante a iteração
    const weightsToSync = [...this.weights];

    for (const weight of weightsToSync) {
      try {
        // Remover o ID local antes de salvar no MongoDB
        const { id, ...weightData } = weight;

        // Criar um novo documento no MongoDB
        const mongoDoc = new mongoModel({
          ...weightData,
          timestamp: new Date(weightData.timestamp),
        });

        // Salvar no MongoDB
        await mongoDoc.save();

        // Remover do armazenamento local após sincronização bem-sucedida
        this.weights = this.weights.filter((w) => w.id !== id);

        syncedCount++;
      } catch (error) {
        console.error(`Erro ao sincronizar peso ${weight.id}:`, error.message);
        failedCount++;
      }
    }

    // Salvar o estado atualizado
    this.saveToFile();

    console.log(
      `Sincronização concluída: ${syncedCount} sincronizados, ${failedCount} falhas`
    );
    return { synced: syncedCount, failed: failedCount };
  }
}

// Criar e exportar uma instância
const localStorage = new LocalWeightStorage();
export default localStorage;
