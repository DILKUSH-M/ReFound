
let extractorPromise = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");

      return pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
      );
    })().catch((error) => {
      extractorPromise = null;
      throw error;
    });
  }

  return extractorPromise;
}

async function semanticSimilarity(textA, textB) {
  if (
    typeof textA !== "string" ||
    typeof textB !== "string" ||
    !textA.trim() ||
    !textB.trim()
  ) {
    throw new Error("Both answers must be non-empty strings.");
  }

  const extractor = await getExtractor();

  const output = await extractor(
    [textA.trim(), textB.trim()],
    {
      pooling: "mean",
      normalize: true,
    }
  );

  const [embeddingA, embeddingB] = output.tolist();

  return embeddingA.reduce(
    (sum, value, index) => sum + value * embeddingB[index],
    0
  );
}

module.exports = { semanticSimilarity };
