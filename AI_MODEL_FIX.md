# AI 模型配置修复说明

## 问题描述

用户遇到错误：`"No provider for model: deepseek-v3.2"`

## 根本原因

1. **模型不匹配**：DeepSeek 官方 API 只支持 `deepseek-chat` 模型，不支持 `deepseek-v3.2`
2. **提供商混淆**：用户可能想使用 DeepSeek 相关的模型，但配置了不正确的提供商或 API 端点

## 修复方案

### 1. 前端设置验证 (`saveSettings()`)

在 `src/pages/options/index.js` 和 `extensions/organize/src/pages/options/index.js` 中添加了 `validateAiModel()` 函数：

```javascript
validateAiModel() {
  const provider = String(this.settings.aiProvider || '').toLowerCase();
  const model = String(this.settings.aiModel || '').trim();

  if (!model) return; // 空模型名将使用默认值

  let validModels = [];

  switch (provider) {
    case 'openai':
      validModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'];
      break;
    case 'deepseek':
      validModels = ['deepseek-chat'];
      break;
    case 'ollama':
      // Ollama 支持任意模型，不验证
      return;
    case 'custom':
      // 自定义提供商支持任意模型，不验证
      return;
  }

  if (validModels.length > 0 && !validModels.includes(model)) {
    console.warn(`[AI设置] 模型 "${model}" 不适用于提供商 "${provider}"，正在重置为默认模型`);
    this.settings.aiModel = validModels[0];
    this.showMessage(`AI模型 "${model}" 不受支持，已重置为 "${validModels[0]}"`, 'warning');
  }
}
```

**功能**：
- 在保存设置时自动验证模型配置
- 对不支持的模型自动重置为默认值
- 显示用户友好的警告信息

### 2. 后端请求验证 (`requestAI()`)

在 `src/background/index.js` 和 `extensions/organize/src/background/index.js` 中添加了 `validateModelForProvider()` 函数：

```javascript
function validateModelForProvider(model, provider) {
  const modelName = String(model).trim().toLowerCase();
  const providerName = String(provider).trim().toLowerCase();

  // 检查 reasoner 类思考模型（返回格式不符合扩展期望）
  if (modelName.includes('reasoner')) {
    return { valid: false, error: '当前选择的模型暂不支持该扩展的返回格式，请切换到标准对话模型' };
  }

  switch (providerName) {
    case 'deepseek':
      // DeepSeek 官方 API 只支持特定模型
      if (!['deepseek-chat'].includes(modelName)) {
        return { valid: false, error: `DeepSeek 官方 API 不支持模型 "${model}"。请使用 "deepseek-chat"，或选择"自定义提供商"并配置支持该模型的 API 端点。` };
      }
      break;
    case 'openai':
      const openaiModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'];
      if (!openaiModels.includes(modelName)) {
        return { valid: false, error: `OpenAI API 不支持模型 "${model}"。支持的模型: ${openaiModels.join(', ')}` };
      }
      break;
    case 'ollama':
      // Ollama 支持任意模型，跳过验证
      break;
    case 'custom':
      // 自定义提供商支持任意模型，包括所有 OpenAI 兼容格式
      // 不进行模型验证，让用户自由配置 API 端点和模型
      break;
  }

  return { valid: true };
}
```

**功能**：
- 在发送 API 请求前进行双重验证
- 提供详细的错误信息和解决方案
- 对自定义提供商保持最大灵活性

## 使用指南

### 对于想使用 DeepSeek 模型的用户

**方案一：使用官方 DeepSeek 提供商**
1. AI 提供商选择：**DeepSeek**
2. AI 模型：**deepseek-chat**（唯一支持的模型）
3. API 密钥：DeepSeek 官方 API 密钥

**方案二：使用自定义提供商**
1. AI 提供商选择：**自定义**
2. API 地址：配置支持 `deepseek-v3.2` 的 API 端点
3. AI 模型：`deepseek-v3.2`（或其他任意模型）

### 对于 OpenAI 兼容的模型

- **GPT-3.5 Turbo**: `gpt-3.5-turbo`（推荐）
- **GPT-4**: `gpt-4`
- **GPT-4 Turbo**: `gpt-4-turbo`
- **GPT-4O**: `gpt-4o`
- **GPT-4O Mini**: `gpt-4o-mini`

## 支持的提供商和模型组合

| 提供商 | 支持的模型 | 说明 |
|--------|------------|------|
| OpenAI | 所有 GPT 系列模型 | 官方 API |
| DeepSeek | 仅 `deepseek-chat` | 官方 API |
| Ollama | 任意模型 | 本地部署 |
| 自定义 | 任意模型 | 用户自行配置 API |

## 修复效果

1. **防止配置错误**：自动检测和修正无效的模型配置
2. **清晰的错误信息**：告诉用户具体问题和解决方案
3. **保持灵活性**：自定义提供商仍然支持任意模型
4. **向后兼容**：不影响现有正常配置的用户

## 文件修改清单

- [x] `src/pages/options/index.js` - 添加 validateAiModel()
- [x] `src/background/index.js` - 添加 validateModelForProvider()
- [x] `extensions/organize/src/pages/options/index.js` - 同步前端验证
- [x] `extensions/organize/src/background/index.js` - 同步后端验证
- [x] 更新 OpenAI 模型列表，包含最新模型
- [x] 同步到 dist 目录