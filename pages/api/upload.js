import { createRouter } from 'next-connect'
import multer from 'multer'
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai')

const API_KEY = process.env.GEMINI_API_KEY
const MODEL_NAME = 'gemini-pro-vision'

const upload = multer({
    storage: multer.memoryStorage()
})

const router = createRouter()

router.use(upload.single('image'))

router.all((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.status(200).end()
    } else {
        next()
    }
})
router.post(async (req, res) => {
    console.log('req.file:', req.file)
    try {
        console.log('Starting request...')
        const genAI = new GoogleGenerativeAI(API_KEY)
        const model = genAI.getGenerativeModel({ model: MODEL_NAME })

        const generationConfig = {
            temperature: 0.8,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096
        }

        const safetySettings = [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            }
        ]

        if (!req.file) {
            console.log('No file uploaded.')
            return res.status(400).json({ error: 'No file uploaded.' })
        }

        const parts = [
            {
                text: '你是一位专业的摄影艺术评论家，负责对摄影作品进行深入的分析和评价。你的目标是帮助摄影师理解其作品的优势和不足，并提供具有针对性的改进建议。

## 能力：

* 分析并解读摄影作品的构图元素
* 评价照片内容的表现力和意义
* 对色调和色彩运用进行专业的评价
* 提供实用的改进建议和艺术指导

## 指南：

### 1. 构图分析

*   请提供照片的构图描述，包括所使用的构图法则（如三分法、对称、领先线等）。
*   评价构图的创新性和对视觉焦点的影响。
*   指出构图中有待改进的部分，并提供具体的修改建议。

### 2. 内容评价

*   阐述照片的内容主题，探讨其表达的意义和情感。
*   分析内容与构图之间的协调性，以及它们如何共同增强艺术效果。
*   如果内容传达存在模糊性或不足，给出明确的改进方向。

### 3. 色调分析

*   描述照片的色调特点，包括色彩的饱和度、对比度和色温。
*   评价色调对于整体氛围和情感表达的作用。
*   提供调整色调的建议，以增强作品的艺术感染力。

### 4. 改进建议

*   综合以上分析，给出具体的改进措施。
*   强调在保持摄影师个人风格的同时，如何融入最佳艺术实践。
*   提供实践练习的建议，以帮助摄影师在未来的作品中应用这些评价。

请在以下Markdown格式中输出你的评价：

```
## 摄影作品艺术性评价

### 构图分析
- 构图描述：
- 评价与建议：

### 内容评价
- 内容阐述：
- 评价与建议：

### 色调分析
- 色调特点：
- 评价与建议：

### 改进建议
- 综合建议：
- 实践练习建议：
```

请确保你的评价具有建设性，同时考虑到摄影师的创作意图和艺术风格。'
            },
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: req.file.buffer.toString('base64')
                }
            }
        ]

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }],
            generationConfig,
            safetySettings
        })

        if (!result) {
            return res.status(502).json({ error: 'Bad Gateway' })
        } else {
            const responseText = result.response.text()
            return res.status(200).json({ result: responseText })
        }
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' })
    }
})

export const config = {
    api: {
        bodyParser: false,
        externalResolver: true
    }
}

export default router.handler()
