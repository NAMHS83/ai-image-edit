
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AIModelVersion, EditMode } from "../types";

const getModelName = (version: AIModelVersion) => {
  return version === AIModelVersion.PRO ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
};

/**
 * Utility to calculate aspect ratio from base64 string
 */
const getImageDimensions = (base64: string): Promise<{ width: number, height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = base64;
  });
};

const getSupportedAspectRatio = (width: number, height: number): "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | undefined => {
  if (width === 0 || height === 0) return undefined;
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.1) return "1:1";
  if (Math.abs(ratio - 0.75) < 0.1) return "3:4";
  if (Math.abs(ratio - 1.33) < 0.1) return "4:3";
  if (Math.abs(ratio - 0.56) < 0.1) return "9:16";
  if (Math.abs(ratio - 1.77) < 0.1) return "16:9";
  return undefined;
};

export const editSceneImage = async (
  version: AIModelVersion,
  sceneBase64: string,
  mode: EditMode,
  options: {
    prompt?: string;
    furnitureBase64?: string;
    maskBase64?: string;
    materialBase64?: string;
    designReferenceBase64?: string;
  }
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API key is missing.");

  const ai = new GoogleGenAI({ apiKey });
  const modelName = getModelName(version);

  const dims = await getImageDimensions(sceneBase64);
  const detectedRatio = getSupportedAspectRatio(dims.width, dims.height);

  const strictRatioInstruction = ` CRITICAL: The output image MUST HAVE the EXACT SAME aspect ratio and dimensions as the input image (${dims.width}x${dims.height}). DO NOT crop, DO NOT stretch, and DO NOT change the perspective or framing.`;

  let fullPrompt = "";
  const parts: any[] = [
    {
      inlineData: {
        mimeType: 'image/png',
        data: sceneBase64.split(',')[1] || sceneBase64,
      },
    }
  ];

  if (options.maskBase64) {
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: options.maskBase64.split(',')[1] || options.maskBase64,
      },
    });
  }

  switch (mode) {
    case EditMode.ERASE:
      fullPrompt = `Erase the areas highlighted in the mask. Instructions: ${options.prompt || 'Remove objects naturally.'} ${strictRatioInstruction}`;
      break;
    case EditMode.FURNITURE:
      if (options.furnitureBase64) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: options.furnitureBase64.split(',')[1] || options.furnitureBase64,
          },
        });
        fullPrompt = `Place the furniture from the reference into the ${options.maskBase64 ? 'masked area' : 'scene'}. ${options.prompt || ''} ${strictRatioInstruction}`;
      } else {
        fullPrompt = `Add modern furniture to the ${options.maskBase64 ? 'masked area' : 'scene'}. ${options.prompt || ''} ${strictRatioInstruction}`;
      }
      break;
    case EditMode.FINISH:
      if (options.materialBase64) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: options.materialBase64.split(',')[1] || options.materialBase64,
          },
        });
        fullPrompt = `Apply the material/texture from the third image to the masked area in the first image. ${options.prompt || ''} ${strictRatioInstruction}`;
      } else {
        fullPrompt = `Change the material of the masked area. Instructions: ${options.prompt || 'Make it look premium.'} ${strictRatioInstruction}`;
      }
      break;
    case EditMode.DESIGN:
      if (options.designReferenceBase64) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: options.designReferenceBase64.split(',')[1] || options.designReferenceBase64,
          },
        });
        fullPrompt = `Redesign the ${options.maskBase64 ? 'masked area' : 'entire scene'} inspired by the design reference image. ${options.prompt || ''} ${strictRatioInstruction}`;
      } else {
        fullPrompt = `Redesign the ${options.maskBase64 ? 'masked area' : 'entire scene'}. Instructions: ${options.prompt || 'Make it modern.'} ${strictRatioInstruction}`;
      }
      break;
  }

  parts.push({ text: fullPrompt });

  const config: any = {
    imageConfig: {}
  };

  if (detectedRatio) {
    config.imageConfig.aspectRatio = detectedRatio;
  }

  if (version === AIModelVersion.PRO) {
    config.imageConfig.imageSize = "1K";
  }

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config,
  });

  let generatedImageBase64 = "";
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        generatedImageBase64 = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }
  }

  if (!generatedImageBase64) {
    throw new Error("Failed to generate image. Please try again with a different prompt.");
  }

  return generatedImageBase64;
};
