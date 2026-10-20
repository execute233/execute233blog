---
title: "OpenAI Responses"
published: 2026-10-20
updated: 2026-10-20
verified: 2026-10-20
section: blog
description: "OpenAI Responses 的 HTTP、JSON、请求参数、输出项与流式事件参考"
tags: [ OpenAI, API ]
category: "AI"
lang: "zh-CN"
tabGroup:
  slug: ai/llm/api
  title: "大模型 API 参考"
  id: responses
  label: Responses
  order: 1
---

## 创建 Response

`POST https://api.openai.com/v1/responses`

调用这个接口，提交文本或输入项，得到消息、工具调用及其他输出项。输入和输出都按 `type` 区分。多轮状态既可以自己维护，也可以交给服务端托管。

```http
POST /v1/responses HTTP/1.1
Host: api.openai.com
Authorization: Bearer <OPENAI_API_KEY>
Content-Type: application/json

{
  "model": "gpt-6-astra",
  "instructions": "用中文简短回答。",
  "input": "什么是 HTTP？"
}
```

### 请求头

| 名称                    | 必填 | 说明                            |
|-----------------------|----|-------------------------------|
| `Authorization`       | 是  | `Bearer <API_KEY>` 形式的 API 密钥 |
| `Content-Type`        | 是  | `application/json`            |
| `OpenAI-Organization` | 否  | 指定组织                          |
| `OpenAI-Project`      | 否  | 指定项目                          |
| `X-Client-Request-Id` | 否  | 调用方的日志关联标识，不提供去重执行保证          |

响应头中的 `x-request-id` 用于定位请求，限额信息见 `x-ratelimit-*`。

## 请求参数

### 模型与输入

| 字段                     | 类型                     | 说明                                                      |
|------------------------|------------------------|---------------------------------------------------------|
| `model`                | string                 | 模型 ID                                                   |
| `input`                | string / object[]      | 文本快捷形式，或消息、工具结果、引用等输入项数组                                |
| `instructions`         | string / null          | 本次生成的系统或开发者指令。使用 `previous_response_id` 时，上一次的此字段不会自动继承 |
| `previous_response_id` | string / null          | 关联上一条 Response；不能与 `conversation` 同时使用                  |
| `conversation`         | string / object / null | 会话 ID，或包含 `id` 的引用对象；会话内容参与上下文，输入输出随后加入该会话              |
| `prompt`               | object / null          | 提示模板引用，包含 `id`、可选 `version` 和 `variables`               |
| `context_management`   | object[] / null        | 上下文管理配置，如 `{"type":"compaction","compact_threshold":…}` |
| `truncation`           | string / null          | `disabled` 为默认策略，超出上下文时失败；`auto` 允许删除较早的输入项以适配上下文       |

### 输出与生成控制

| 字段                  | 类型              | 说明                                  |
|---------------------|-----------------|-------------------------------------|
| `max_output_tokens` | integer / null  | 输出上限，包含可见输出与推理 token                |
| `temperature`       | number / null   | 采样温度，范围 `0` 到 `2`                   |
| `top_p`             | number / null   | 核采样阈值，通常不要与 `temperature` 同时调节      |
| `text`              | object          | 文本格式和详细程度，包含 `format` 与 `verbosity` |
| `reasoning`         | object / null   | 推理投入、摘要、上下文和执行模式配置                  |
| `include`           | string[] / null | 要额外返回的详细数据，例如搜索结果、引用来源或加密推理内容       |
| `top_logprobs`      | integer / null  | 每个 token 位置返回的候选概率数量，范围 `0` 到 `20`  |
| `moderation`        | object / null   | 审核模型与输入、输出审核策略                      |

### 工具

| 字段                    | 类型              | 说明                                       |
|-----------------------|-----------------|------------------------------------------|
| `tools`               | object[]        | 函数工具、自定义工具及内置工具定义                        |
| `tool_choice`         | string / object | `none`、`auto`、`required`，或者指定工具、限制可选工具集合 |
| `parallel_tool_calls` | boolean / null  | 是否允许并行工具调用                               |
| `max_tool_calls`      | integer / null  | 一次 Response 内所有内置工具的总调用上限，不是每个工具各自的上限    |

### 流式、存储与服务配置

| 字段                       | 类型             | 说明                                                       |
|--------------------------|----------------|----------------------------------------------------------|
| `stream`                 | boolean / null | 返回带事件类型的 SSE 流                                           |
| `stream_options`         | object / null  | 流配置，目前包括 `include_obfuscation`                           |
| `background`             | boolean / null | 后台运行。后台生成可能先返回排队或进行中的状态                                  |
| `store`                  | boolean / null | 是否存储以供后续访问；省略时默认为 `true`，仍受组织保留策略约束                      |
| `metadata`               | object / null  | 最多 16 组字符串键值，键最长 64 字符、值最长 512 字符                        |
| `service_tier`           | string / null  | 服务处理等级，取决于模型、账户与项目配置                                     |
| `safety_identifier`      | string / null  | 稳定的最终用户标识，避免直接发送个人身份信息                                   |
| `prompt_cache_key`       | string / null  | 缓存归类键                                                    |
| `prompt_cache_options`   | object         | 新版缓存模式、TTL、预热与诊断配置                                       |
| `access_programs`        | object         | 特定领域的访问计划；例如 `cyber`，需要相应权限                              |
| `user`                   | string         | 兼容字段，由 `safety_identifier` 与 `prompt_cache_key` 分别承担对应用途 |
| `prompt_cache_retention` | string / null  | 已弃用的缓存保留策略；新版配置使用 `prompt_cache_options.ttl`，并非直接改名      |

## 输入项

### 消息

消息的 `role` 可以是 `user`、`assistant`、`system` 或 `developer`。输入快捷消息的 `content` 可以是字符串，也可以是内容块数组；详细类型通过
`type: "message"` 标识。

```json
[
  {
    "role": "user",
    "content": [
      {
        "type": "input_text",
        "text": "描述这张图片。"
      },
      {
        "type": "input_image",
        "image_url": "https://www.example.com/example.jpg",
        "detail": "auto"
      }
    ]
  }
]
```

| 内容类型          | 主要字段                                            | 说明                                 |
|---------------|-------------------------------------------------|------------------------------------|
| `input_text`  | `text`                                          | 文本                                 |
| `input_image` | `image_url` / `file_id`、`detail`                | 图片 URL、data URL 或已上传图片             |
| `input_file`  | `file_id` / `file_url` / `file_data`、`filename` | 文件引用、远程文件或内联文件数据；使用符合当前文件输入要求的一种来源 |

返回的助手消息里可能是 `output_text`，也可能是 `refusal`。把已经生成的输出项用于后续轮次时，保留它的原始结构。

### 工具结果与引用

`input` 还接受 `function_call_output`、自定义工具结果、计算机操作结果、历史工具调用与推理项等。`item_reference` 通过 `id`
引用已有项。

函数结果示例：

```json
{
  "model": "gpt-6-astra",
  "previous_response_id": "resp_weather_example",
  "input": [
    {
      "type": "function_call_output",
      "call_id": "call_weather_1",
      "output": "{\"temperature_c\":22,\"condition\":\"晴\"}"
    }
  ]
}
```

注意，`call_id` 对应的是模型发起的调用，不是函数调用项自己的 `id`。

### 多轮状态

多轮状态可以自己维护，也可以交给服务端托管。自己维护时，把需要保留的历史输入和 `output` 项继续放进下一次 `input`；交给服务端时，用
`previous_response_id` 接上一条响应，或用 `conversation` 接一个会话。这两个参数互斥，不能同时传。

```json
{
  "model": "gpt-6-astra",
  "previous_response_id": "resp_example",
  "instructions": "继续用中文简短回答。",
  "input": "HTTPS 多了什么？"
}
```

引用上一条响应时，历史输入仍参与上下文与用量计算。

## 返回对象

<details>
<summary>查看返回 JSON 示例</summary>

```json
{
  "id": "resp_example",
  "object": "response",
  "created_at": 1792454400,
  "status": "completed",
  "model": "gpt-6-astra",
  "error": null,
  "incomplete_details": null,
  "output": [
    {
      "id": "msg_example",
      "type": "message",
      "status": "completed",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "HTTP 是客户端和服务器交换请求与响应的协议。",
          "annotations": []
        }
      ]
    }
  ],
  "usage": {
    "input_tokens": 20,
    "input_tokens_details": {
      "cached_tokens": 0
    },
    "output_tokens": 15,
    "output_tokens_details": {
      "reasoning_tokens": 0
    },
    "total_tokens": 35
  }
}
```

</details>

### Response 字段

| 字段                                                                 | 说明                                                                                |
|--------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| `id`、`object`                                                      | 响应标识；`object` 固定为 `response`                                                      |
| `created_at`、`completed_at`                                        | Unix 秒级时间；完成时间在对应状态下出现                                                            |
| `model`                                                            | 实际使用的模型                                                                           |
| `status`                                                           | `queued`、`in_progress`、`completed`、`failed`、`cancelled` 或 `incomplete`            |
| `error`                                                            | 生成错误，包含 `code`、`message`，成功时通常为空                                                  |
| `incomplete_details`                                               | 未完成的原因，如 `max_output_tokens`、`max_messages`、`content_filter`；部分传输流程还会使用 `steered` |
| `output`                                                           | 输出项数组，可能同时出现推理、工具调用和消息                                                            |
| `usage`                                                            | 输入、输出、缓存、推理及总 token 数                                                             |
| `instructions`                                                     | 生效的指令                                                                             |
| `conversation`、`previous_response_id`                              | 关联会话与前一条响应                                                                        |
| `tools`、`tool_choice`、`parallel_tool_calls`、`max_tool_calls`       | 生效的工具配置                                                                           |
| `text`、`reasoning`                                                 | 生效的文本、推理配置                                                                        |
| `temperature`、`top_p`、`top_logprobs`、`max_output_tokens`           | 生成配置                                                                              |
| `background`、`service_tier`                                        | 执行方式与实际处理等级                                                                       |
| `metadata`、`prompt`、`safety_identifier`、`user`                     | 元数据、模板引用及用户标识                                                                     |
| `prompt_cache_key`、`prompt_cache_retention`、`prompt_cache_options` | 缓存配置                                                                              |
| `prompt_cache_diagnostics`                                         | 请求缓存比较时的诊断结果                                                                      |
| `moderation`、`access_programs`                                     | 审核结果与实际访问计划                                                                       |
| `truncation`                                                       | 输入截断策略                                                                            |

HTTP 返回的文本位于 `output` 消息项的 `content` 中，筛选 `type: "output_text"` 后读取 `text`。部分 SDK 的 `output_text`
是聚合属性。

### 输出项类型

| 类型                                                 | 主要字段或用途                                             |
|----------------------------------------------------|-----------------------------------------------------|
| `message`                                          | `id`、`role`、`status`、`content[]`                    |
| `function_call`                                    | `id`、`call_id`、`name`、字符串 `arguments`、`status`      |
| `custom_tool_call`                                 | `call_id`、`name`、自由文本 `input`                       |
| `reasoning`                                        | `id`、`summary[]`、可选 `encrypted_content`，以及模型支持的推理内容 |
| `web_search_call`                                  | 搜索动作、状态及可选来源                                        |
| `file_search_call`                                 | 查询、状态和按需包含的搜索结果                                     |
| `code_interpreter_call`                            | 容器、代码、执行状态和结果                                       |
| `computer_call`                                    | 计算机操作动作、调用 ID 与安全检查                                 |
| `mcp_call`、`mcp_list_tools`、`mcp_approval_request` | 远程 MCP 调用、工具目录及审批                                   |
| `image_generation_call`                            | 图片生成状态与结果                                           |
| `local_shell_call`、`shell_call`、`apply_patch_call` | 受支持环境中的 Shell 或文件补丁调用                               |
| `tool_search_call`                                 | 工具搜索及延迟加载相关输出                                       |
| `compaction`                                       | 上下文压缩项，应按原始类型保存和回传                                  |

`output_text.annotations` 可以包含文件引用、URL 引用、文件路径或容器文件引用，具体结构由注解类型区分。

## 工具定义

### 函数工具

函数的 `name`、`parameters` 等字段直接放在工具对象上。

```json
{
  "model": "gpt-6-astra",
  "input": "杭州现在的天气如何？",
  "tools": [
    {
      "type": "function",
      "name": "get_weather",
      "description": "查询指定城市的当前天气。",
      "parameters": {
        "type": "object",
        "properties": {
          "city": {
            "type": "string"
          }
        },
        "required": [
          "city"
        ],
        "additionalProperties": false
      },
      "strict": true
    }
  ],
  "tool_choice": "auto"
}
```

模型产生 `function_call` 后，客户端读取 `arguments`、校验并执行，再用 `function_call_output` 回传。

### 工具类型目录

| 配置类型                                | 配置与执行要点                                                                 |
|-------------------------------------|-------------------------------------------------------------------------|
| `function`                          | 客户端执行；`name`、`parameters`、`description`、`strict`                        |
| `custom`                            | 客户端接收自由文本；`name`、`description`、`format`，格式可为普通文本或 grammar               |
| `web_search` / `web_search_preview` | 服务端搜索；支持范围、过滤器、近似位置等随工具版本变化                                             |
| `file_search`                       | 指定 `vector_store_ids`，可配置 `max_num_results`、`filters`、`ranking_options` |
| `code_interpreter`                  | 配置 `container`，使用已有容器或自动容器及其文件配置                                        |
| `image_generation`                  | 图片大小、质量、格式、背景等配置，输出为对应生成项                                               |
| `computer_use_preview` / `computer` | 屏幕尺寸与运行环境；客户端负责执行操作和回传结果                                                |
| `mcp`                               | `server_label`、服务器或连接器、允许工具、认证与审批配置                                     |
| `local_shell` / `shell`             | 客户端或托管环境执行；按工具类型处理结果与权限                                                 |
| `apply_patch`                       | 文件修改操作，必须由实际执行环境校验和应用                                                   |
| `tool_search`                       | 按需查找并加载工具，支持范围取决于模型                                                     |
| `programmatic_tool_calling`         | 以程序方式编排工具，要求相应模型和运行环境                                                   |

各工具的嵌套字段见参考文档中的官方 `ToolParam` 类型定义。

### `tool_choice`

常用字符串为 `none`、`auto`、`required`。指定函数的结构是 `{"type":"function","name":"get_weather"}`。限制允许工具时使用
`allowed_tools` 类型及工具列表；MCP、自定义工具、Shell 等使用各自的选择对象。

## 格式化输出与高级配置

### `text`

`text.verbosity` 为 `low`、`medium`、`high`。`text.format.type` 可以是 `text`、`json_object` 或 `json_schema`；JSON Schema
的定义如下：

```json
{
  "text": {
    "format": {
      "type": "json_schema",
      "name": "city_result",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "city": {
            "type": "string"
          }
        },
        "required": [
          "city"
        ],
        "additionalProperties": false
      }
    }
  }
}
```

### `reasoning`

| 字段                 | 取值与含义                                                      |
|--------------------|------------------------------------------------------------|
| `effort`           | `none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`；按模型选择 |
| `summary`          | `auto`、`concise`、`detailed`，请求可公开的推理摘要                     |
| `context`          | `auto`、`current_turn`、`all_turns`，控制后续轮次使用哪些推理项            |
| `mode`             | 推理执行模式，如 `standard` 或 `pro`，依赖模型能力                         |
| `generate_summary` | 旧字段，使用 `summary`                                           |

无状态传递推理项时，可用 `include: ["reasoning.encrypted_content"]` 获取加密项并原样回传。

### `include`

可选路径包括 `file_search_call.results`、`web_search_call.results`、`web_search_call.action.sources`、
`message.input_image.image_url`、`computer_call_output.output.image_url`、`code_interpreter_call.outputs`、
`reasoning.encrypted_content`、`message.output_text.logprobs`。

### 缓存、审核与访问计划

`prompt_cache_options` 包含 `mode`（`implicit` / `explicit`）、`ttl`（`30m`）、`prewarm`、`comparison_response_id`
。其中预热和诊断需要相应能力；诊断可能返回缓存命中、未命中原因、比较对象不存在或不可用等结果。

`moderation` 指定审核 `model`，可配置 `policy.input.mode` 与 `policy.output.mode` 为 `score` 或 `block`。

`access_programs.cyber` 的类型包含 `standard`、`daybreak_blue`、`daybreak_red`。需要对应的访问权限。

## 流式事件

设置 `stream: true` 后，事件按类型区分生命周期、输出项、内容块、文本和工具参数。

```text
event: response.created
data: {"type":"response.created","sequence_number":0,"response":{"id":"resp_example","object":"response","status":"in_progress","output":[]}}

event: response.output_text.delta
data: {"type":"response.output_text.delta","sequence_number":3,"item_id":"msg_example","output_index":0,"content_index":0,"delta":"你好","logprobs":[]}

event: response.output_text.done
data: {"type":"response.output_text.done","sequence_number":4,"item_id":"msg_example","output_index":0,"content_index":0,"text":"你好","logprobs":[]}

event: response.completed
data: {"type":"response.completed","sequence_number":7,"response":{"id":"resp_example","object":"response","status":"completed","output":[{"id":"msg_example","type":"message","status":"completed","role":"assistant","content":[{"type":"output_text","text":"你好","annotations":[]}]}]}}
```

示例省略了部分事件和 Response 字段，因此 `sequence_number` 不连续。

### 生命周期与内容事件

| 事件族                                                                     | 作用                           |
|-------------------------------------------------------------------------|------------------------------|
| `response.created`、`response.queued`、`response.in_progress`             | 已创建、排队、生成中。具体事件由执行模式决定       |
| `response.completed`                                                    | 本次生成成功完成，最终 Response 中可以包含用量 |
| `response.failed`、`response.incomplete`                                 | 失败或未完成，不能作为完整成功处理            |
| `response.output_item.added` / `.done`                                  | 创建或结束某个输出项                   |
| `response.content_part.added` / `.done`                                 | 创建或结束消息中的内容块                 |
| `response.output_text.delta` / `.done`                                  | 文本增量或完整文本                    |
| `response.output_text.annotation.added`                                 | 为文本增加引用等注解                   |
| `response.refusal.delta` / `.done`                                      | 拒绝内容                         |
| `response.reasoning_summary_part.*`、`response.reasoning_summary_text.*` | 推理摘要块及其文本                    |
| `response.reasoning_text.*`                                             | 支持对应输出的推理文本事件                |
| `error`                                                                 | 流内错误；HTTP 连接已经成功也仍可能收到       |

### 工具与专用事件

函数参数使用 `response.function_call_arguments.delta` / `.done`；自定义工具使用 `response.custom_tool_call_input.delta` /
`.done`。内置工具还有搜索、代码解释器、图片生成、MCP、Shell、补丁和工具搜索各自的状态及增量事件，完整名称见官方事件类型目录。

用 `item_id` / `output_index` 定位输出项，用 `content_index` 定位内容块。把对应的 `delta` 拼起来；`.done`
已经带完整结果，不要再追加一次。工具参数收全后再解析 JSON。Responses 的终止以生命周期事件为准，没有 `[DONE]` 标记。

## 错误

HTTP 错误通常返回 `error` 对象；已创建的 Response 还可能通过 `status: "failed"` 与 `error` 表达失败，或通过
`status: "incomplete"` 与 `incomplete_details` 表达未完成。

```json
{
  "error": {
    "message": "The request contains an unsupported parameter.",
    "type": "invalid_request_error",
    "param": "reasoning",
    "code": "unsupported_parameter"
  }
}
```

`400` 检查字段与模型能力，`401` 检查密钥，`403` 检查权限，`404` 检查模型或资源可见性，`429` 区分限流和额度，`5xx`
根据服务状态有限退避重试。

## 参考文档

- [Responses 概览](https://developers.openai.com/api/reference/responses/overview)
- [创建接口](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [流式事件](https://developers.openai.com/api/reference/resources/responses/streaming-events)
- [官方 SDK 顶层参数](https://github.com/openai/openai-python/blob/8968560fb926240aea5fed8ee24e189eade57118/src/openai/types/responses/response_create_params.py)
- [输入项定义](https://github.com/openai/openai-python/blob/8968560fb926240aea5fed8ee24e189eade57118/src/openai/types/responses/response_input_param.py)
- [工具类型目录](https://github.com/openai/openai-python/blob/8968560fb926240aea5fed8ee24e189eade57118/src/openai/types/responses/tool_param.py)
- [输出项目录](https://github.com/openai/openai-python/blob/8968560fb926240aea5fed8ee24e189eade57118/src/openai/types/responses/response_output_item.py)
- [事件类型目录](https://github.com/openai/openai-python/blob/8968560fb926240aea5fed8ee24e189eade57118/src/openai/types/responses/response_stream_event.py)
