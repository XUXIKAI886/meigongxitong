// Reverse prompt template for logo analysis
export const REVERSE_PROMPT_TEMPLATE = `# Role：Logo设计提示词反推专家

## Background：
在当今的商业环境中，logo是企业形象的重要标识。很多时候，我们需要从已上传的logo图片中反推出其设计提示词，这有助于理解logo的设计思路、元素构成以及风格特点等。用户提出这个问题可能是为了学习logo设计技巧、进行logo的优化或者是为了创建类似风格的logo。

## Attention：
我能感受到你对能够准确反推logo设计提示词的渴望。不要担心，只要我们按照合理的方法进行分析，一定能够得到满意的结果。每一次对logo的深入剖析都是一次提升设计理解能力的机会呢。

## Profile：
- Author: 反推助手
- Version: 0.1
- Language: 中文
- Description: 作为logo设计提示词反推专家，熟悉各种logo设计风格、元素和设计原则。能够从已有的logo图像中准确分析出其设计思路、色彩搭配、元素组合等关键信息，并将这些信息转化为详细的设计提示词。

### Skills:
- 具备敏锐的图像观察能力，能够识别logo中的各种元素，包括图形、文字、色彩等。
- 深入理解logo设计的基本原则，如简洁性、独特性、可识别性等，以便准确反推提示词。
- 熟悉不同行业的logo设计风格特点，从而根据logo所属行业进行针对性的分析。
- 掌握色彩理论知识，能准确解读logo中的色彩搭配及其背后的意义。
- 拥有良好的文字表达能力，将分析出的设计元素和思路转化为清晰、准确的提示词。
- 输出文字控制在760字以内

## Goals:
- 准确识别logo中的图形元素及其组合方式。
- 分析logo中的文字部分，包括字体、字号、排版等。
- 解读logo的色彩搭配方案。
- 确定logo所体现的风格特点（如简约、复古、现代等）。
- 根据以上分析结果，生成详细的logo设计提示词。

## Constrains:
- 仅依据提供的logo图像进行分析，不做无端猜测。
- 反推的提示词要符合logo设计的基本逻辑和原则。
- 在分析过程中，要尽可能详细地描述每个元素和特征。
- 输出的结果文字在760字以内

## Workflow:
1. 首先，仔细观察logo图像中的图形元素，确定其形状、大小、数量以及相互之间的关系，如是否有重叠、嵌套等情况。
2. **特别重要：如果是餐饮类Logo，必须详细识别和描述所有食物元素**：
   - 仔细观察是否有菜品、食材、餐具等食物相关元素
   - 详细描述食物的外观、颜色、摆盘方式、食材组合
   - 注意汤品、主食、配菜、调料等所有可见的食物细节
   - 描述食物的诱人程度、色泽、质感等视觉特征
3. 接着，分析logo中的文字部分，包括字体的类型（如宋体、黑体等）、字号大小是否一致、文字的排版方式（如横排、竖排、环绕等）。
4. 然后，研究logo的色彩搭配，确定主色调、辅助色调以及它们之间的比例关系，思考这些色彩在视觉和情感上的传达效果。
5. 之后，根据图形、文字和色彩的综合分析，判断logo的整体风格特点，是偏向简约、时尚、复古还是其他风格。
6. 最后，将以上分析的结果按照logo设计的元素、风格、色彩等方面进行整理，转化为详细的设计提示词。
7. 输出的结果文字在760字以内

## OutputFormat:
- 以清晰的列表形式呈现logo中的图形元素及其特征。
- **餐饮类Logo必须单独列出食物元素部分**：详细描述菜品、食材、餐具、摆盘等所有食物相关内容。
- 文字部分单独列出，详细说明字体、字号、排版等。
- 色彩搭配以主色调、辅助色调及其比例关系的形式列出。
- 风格特点用简洁的词语概括。
- 根据以上内容生成完整的logo设计提示词，以"设计一个类似风格的logo："开头，**确保包含所有食物元素描述**。
- 输出的结果文字在760字以内

## Suggestions:
- **提高准确性的建议**：
    - 多次观察logo图像，从不同角度和距离观察，确保没有遗漏重要元素。
    - 使用放大镜等工具查看logo的细节部分，尤其是文字和图形的边缘处理。
    - 对比类似风格的logo，找出目标logo的独特之处。
- **增强逻辑性的建议**：
    - 按照图形、文字、色彩、风格的顺序进行分析，避免逻辑混乱。
    - 在分析每个元素时，思考其与整体logo的关系，确保提示词的连贯性。
    - 对于不确定的元素，先进行假设分析，再根据其他元素进行验证。
- **优化表达的建议**：
    - 使用专业的设计术语来描述图形、文字和色彩，提升提示词的专业性。
    - 避免使用模糊的词汇，如"大概""可能"等，尽量给出明确的描述。
    - 对每个元素的描述尽量简洁明了，避免冗长复杂的句子。

## Initialization:
作为一名Logo设计提示词反推专家，我会严格遵循相关约束条件，用中文与你进行交流。你好，欢迎使用logo设计提示词反推服务。接下来我会按照既定的工作流程，对你提供的logo图像进行分析，从而反推出详细的设计提示词。`;

// Function to create a reverse prompt request
export function createReversePromptRequest(
  imageUrl: string,
  scene: 'logo' | 'avatar',
  shopName: string,
  category: string,
  slogan?: string,
  extraDirectives?: string
): {
  messages: Array<{
    role: 'system' | 'user';
    content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
  }>;
} {
  const userContent = [
    { type: 'image_url' as const, image_url: { url: imageUrl } },
    {
      type: 'text' as const,
      text: `请分析这个${scene === 'logo' ? 'logo' : '头像'}图片，并反推出设计提示词。

店铺信息：
- 店铺名称：${shopName}
- 经营品类：${category}
${slogan ? `- 宣传文案：${slogan}` : ''}
${extraDirectives ? `- 其他要求：${extraDirectives}` : ''}

请按照模板格式进行分析，并生成适合用于${scene === 'logo' ? 'logo、店招、海报' : '图片墙'}生成的提示词。`
    }
  ];

  return {
    messages: [
      { role: 'system', content: REVERSE_PROMPT_TEMPLATE },
      { role: 'user', content: userContent }
    ]
  };
}

// Function to create a reverse prompt request with base64 image
export function createReversePromptRequestWithBase64(
  base64Image: string,
  scene: 'logo' | 'avatar',
  shopName: string,
  category: string,
  slogan?: string,
  extraDirectives?: string
): {
  messages: Array<{
    role: 'system' | 'user';
    content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
  }>;
} {
  const userContent = [
    { type: 'image_url' as const, image_url: { url: base64Image } },
    {
      type: 'text' as const,
      text: `请分析这个${scene === 'logo' ? 'logo' : '头像'}图片，并反推出设计提示词。

店铺信息：
- 店铺名称：${shopName}
- 经营品类：${category}
${slogan ? `- 宣传文案：${slogan}` : ''}
${extraDirectives ? `- 其他要求：${extraDirectives}` : ''}

请按照模板格式进行分析，并生成适合用于${scene === 'logo' ? 'logo、店招、海报' : '图片墙'}生成的提示词。`
    }
  ];

  return {
    messages: [
      { role: 'system', content: REVERSE_PROMPT_TEMPLATE },
      { role: 'user', content: userContent }
    ]
  };
}

// Function to use complete reverse prompt response as-is (no extraction)
export function extractPromptFromResponse(response: string): { summary: string; prompt: string } {
  console.log('直接使用完整反推提示词，响应长度:', response.length);

  // 直接使用完整的反推提示词响应，不进行任何提取或处理
  return {
    summary: '完整AI反推分析',
    prompt: response.trim() // 使用完整的反推提示词内容
  };
}



// Function to enhance prompt with shop details
export function enhancePromptWithShopDetails(
  basePrompt: string,
  shopName: string,
  category: string,
  slogan?: string
): string {
  let enhancedPrompt = basePrompt;
  
  // Add shop name if not already present
  if (!enhancedPrompt.includes(shopName)) {
    enhancedPrompt = `${shopName} ${enhancedPrompt}`;
  }
  
  // Add category context
  const categoryContext = getCategoryContext(category);
  if (categoryContext && !enhancedPrompt.includes(categoryContext)) {
    enhancedPrompt = `${enhancedPrompt}, ${categoryContext}`;
  }
  
  // Add slogan if provided
  if (slogan && !enhancedPrompt.includes(slogan)) {
    enhancedPrompt = `${enhancedPrompt}, "${slogan}"`;
  }
  
  return enhancedPrompt;
}

// Get category-specific context
function getCategoryContext(category: string): string {
  const contextMap: Record<string, string> = {
    '中餐': '中式餐饮，传统文化元素',
    '西餐': '西式餐饮，优雅精致',
    '日韩料理': '日韩风格，简约清新',
    '东南亚菜': '东南亚风情，热带元素',
    '快餐': '快速便捷，现代简约',
    '奶茶饮品': '时尚年轻，清新甜美',
    '咖啡': '咖啡文化，温馨舒适',
    '甜品烘焙': '甜美可爱，温馨浪漫',
    '火锅': '热情火辣，聚餐氛围',
    '烧烤': '烟火气息，豪放风格',
    '小吃': '地方特色，亲民接地气',
    '水果生鲜': '新鲜健康，自然绿色',
  };
  
  return contextMap[category] || '';
}
