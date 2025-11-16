# Supabase 注册确认邮件模板

## 主题（Subject）
```
欢迎使用 7dia | 每日记录
```

## HTML 模板（HTML Template）

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">7dia | 每日记录</h1>
  </div>
  
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1f2937; margin-top: 0; font-size: 24px; font-weight: 600;">欢迎加入！</h2>
    
    <p style="color: #4b5563; font-size: 16px; margin: 20px 0;">
      感谢您注册 <strong>7dia | 每日记录</strong>！
    </p>
    
    <p style="color: #4b5563; font-size: 16px; margin: 20px 0;">
      请点击下面的按钮确认您的邮箱地址，完成注册：
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; transition: background 0.2s;">
        确认邮箱地址
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; margin: 30px 0 0 0;">
      如果按钮无法点击，您也可以复制以下链接到浏览器中打开：
    </p>
    
    <p style="color: #3b82f6; font-size: 14px; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 4px; margin: 10px 0;">
      {{ .ConfirmationURL }}
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      <strong>提示：</strong>此链接将在 24 小时后过期。如果您没有注册此账户，请忽略此邮件。
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 5px 0;">© 2024 7dia | 每日记录</p>
    <p style="margin: 5px 0;">学习/想法记录工具</p>
  </div>
</body>
</html>
```

## 纯文本模板（Plain Text Template）

```
欢迎加入 7dia | 每日记录！

感谢您注册我们的服务！

请点击以下链接确认您的邮箱地址，完成注册：

{{ .ConfirmationURL }}

提示：此链接将在 24 小时后过期。如果您没有注册此账户，请忽略此邮件。

---
© 2024 7dia | 每日记录
学习/想法记录工具
```

## 使用说明

1. 登录 Supabase 控制台
2. 进入 `Authentication` → `Email Templates`
3. 选择 `Confirm signup` 模板
4. 将上面的 HTML 模板复制到 `HTML` 字段
5. 将上面的纯文本模板复制到 `Plain text` 字段
6. 将主题复制到 `Subject` 字段
7. 点击 `Save` 保存

## 模板特点

- ✅ 中文内容，友好专业
- ✅ 响应式设计，适配各种设备
- ✅ 清晰的确认按钮
- ✅ 备用链接（如果按钮无法点击）
- ✅ 安全提示信息
- ✅ 品牌标识（7dia | 每日记录）

## 可自定义的部分

- 颜色：可以修改 `#3b82f6`（蓝色）为其他颜色
- 品牌名称：可以修改 "7dia | 每日记录"
- 提示文字：可以根据需要调整

