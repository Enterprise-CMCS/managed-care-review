import { pipeline } from "@xenova/transformers"
import type { EmbeddingProvider } from "./embeddingProvider"

// Xenova's pipeline type is intentionally broad because the same helper can
// represent many model tasks. For this adapter, we only care about the narrow
// feature-extraction shape we actually use: text in, tensor-like output out.
type FeatureExtractionPipeline = (
  input: string | string[],
  options?: {
    pooling?: 'mean'
    normalize?: boolean
  }
) => Promise<{
  tolist(): unknown
}>

export class XenovaEmbeddingProvider implements EmbeddingProvider {
  // Hold onto the model-loading promise so the local model is initialized once
  // and reused across embedding calls.
  private extractorPromise: Promise<FeatureExtractionPipeline> | null = null

  constructor (
    private readonly modelName: string = 'Xenova/all-MiniLM-L6-v2'
  ) {}

  // Expose the active model name so local runs can log which embedding model
  // produced the vectors.
  getModelInfo(): string {
    return this.modelName
  }

  // Convenience method for callers that only need one embedding. Internally it
  // reuses embedTexts so the batching logic stays in one place.
  async embedText(text: string): Promise<number[]> {
    const [vector] = await this.embedTexts([text])
    return vector
  }

  // Convert one or more text strings into embedding vectors. Each input string
  // should produce one numeric vector of consistent length.
  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return []
    }

    const extractor = await this.getExtractor()
    const embeddings = await extractor(texts, {
      // Mean pooling collapses token-level model output into one vector per text.
      pooling: 'mean',
      // Normalized vectors are easier to compare later with similarity metrics.
      normalize: true
    })

    return embeddings.tolist() as number[][]
  }

  // Load the Xenova feature-extraction pipeline lazily the first time it is
  // needed, then return the cached instance on later calls.
  private async getExtractor(): Promise<FeatureExtractionPipeline> {
    if (!this.extractorPromise) {
      // Lazily load the model once so repeated calls do not reinitialize it.
      // The cast stays inside this adapter so the rest of the codebase can rely
      // on the clean EmbeddingProvider interface instead of Xenova's broad types.
      this.extractorPromise = pipeline(
        // Feature extraction tells Xenova we want embeddings, not generated text.
        'feature-extraction',
        this.modelName
      ) as Promise<FeatureExtractionPipeline>
    }

    return this.extractorPromise
  }
}
