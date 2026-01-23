# 🎨 Interactive Buttons & Rich Media Guide

Complete guide for creating interactive buttons, carousels, and albums in Liora.

---

## 📋 Table of Contents

- [Interactive Buttons](#interactive-buttons)
- [Carousel Messages](#carousel-messages)
- [Album Messages](#album-messages)
- [Media Attachments](#media-attachments)

---

## 🎯 Interactive Buttons

Liora supports 15+ types of interactive buttons for rich user experiences.

### 1. Quick Reply Button

Creates a simple clickable button that sends a predefined response.

```javascript
await sock.client(m.chat, {
    text: "Example message body",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "Example Button",
                id: "example_button_id",
            }),
        },
    ],
});
```

### 2. CTA URL Button

Opens a URL when clicked, useful for external links.

```javascript
await sock.client(m.chat, {
    text: "Example message body",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: "Example Button",
                url: "https://example.com",
                merchant_url: "https://example.com",
            }),
        },
    ],
});
```

### 3. CTA Copy Button

Copies text to clipboard when clicked.

```javascript
await sock.client(m.chat, {
    text: "Example message body",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
                display_text: "Example Button",
                copy_code: "EXAMPLE123",
            }),
        },
    ],
});
```

### 4. CTA Call Button

Initiates a phone call when clicked.

```javascript
await sock.client(m.chat, {
    text: "Example message body",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "cta_call",
            buttonParamsJson: JSON.stringify({
                display_text: "Example Button",
                phone_number: "628123456789",
            }),
        },
    ],
});
```

### 5. CTA Catalog Button

Opens WhatsApp Business catalog.

```javascript
await sock.client(m.chat, {
    text: "Example message body",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "cta_catalog",
            buttonParamsJson: JSON.stringify({
                business_phone_number: "628123456789",
            }),
        },
    ],
});
```

### 6. CTA Reminder Button

Sets a reminder for the user.

```javascript
await sock.client(m.chat, {
    text: "Example message body",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "cta_reminder",
            buttonParamsJson: JSON.stringify({
                display_text: "Example Button",
            }),
        },
    ],
});
```

### 7. CTA Cancel Reminder Button

Cancels an existing reminder.

```javascript
await sock.client(m.chat, {
    text: "Example message body",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "cta_cancel_reminder",
            buttonParamsJson: JSON.stringify({
                display_text: "Example Button",
            }),
        },
    ],
});
```

### 8. Address Message Button

Requests address from the user.

```javascript
await sock.client(m.chat, {
    text: "Example message body",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "address_message",
            buttonParamsJson: JSON.stringify({
                display_text: "Example Button",
            }),
        },
    ],
});
```

### 9. Send Location Button

Requests location from the user.

```javascript
await sock.client(m.chat, {
    text: "Example message body",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "send_location",
            buttonParamsJson: JSON.stringify({
                display_text: "Example Button",
            }),
        },
    ],
});
```

### 10. Open Webview Button

Opens a webview inside WhatsApp.

```javascript
await sock.client(m.chat, {
    text: "Example message body",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "open_webview",
            buttonParamsJson: JSON.stringify({
                title: "Example Webview",
                link: {
                    in_app_webview: true,
                    url: "https://example.com",
                },
            }),
        },
    ],
});
```

### 11. MPM (Marketplace) Button

Links to a product in WhatsApp marketplace.

```javascript
await sock.client(m.chat, {
    text: "Example message body",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "mpm",
            buttonParamsJson: JSON.stringify({
                product_id: "example_product_123",
            }),
        },
    ],
});
```

### 12. Single Select Button

Creates a dropdown selection menu.

```javascript
await sock.client(m.chat, {
    text: "Example message body",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
                title: "Example Menu",
                sections: [
                    {
                        title: "Example Section 1",
                        highlight_label: "Popular",
                        rows: [
                            {
                                header: "Example Header 1",
                                title: "Example Title 1",
                                description: "Example Description 1",
                                id: "example_option_1",
                            },
                            {
                                header: "Example Header 2",
                                title: "Example Title 2",
                                description: "Example Description 2",
                                id: "example_option_2",
                            },
                        ],
                    },
                    {
                        title: "Example Section 2",
                        rows: [
                            {
                                header: "Example Header 3",
                                title: "Example Title 3",
                                description: "Example Description 3",
                                id: "example_option_3",
                            },
                        ],
                    },
                ],
            }),
        },
    ],
});
```

---

## 📱 Media Attachments

Buttons can be combined with various media types.

### Image with Buttons

```javascript
await sock.client(m.chat, {
    image: {
        url: "https://via.placeholder.com/800x600?text=Example+Image",
    },
    caption: "Example Caption",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "Example Button",
                id: "example_id",
            }),
        },
    ],
    hasMediaAttachment: true,
});
```

### Video with Buttons

```javascript
await sock.client(m.chat, {
    video: {
        url: "https://example.com/video.mp4",
    },
    caption: "Example Caption",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "Example Button",
                id: "example_id",
            }),
        },
    ],
    hasMediaAttachment: true,
});
```

### Document with Buttons

```javascript
await sock.client(m.chat, {
    document: {
        url: "https://example.com/document.pdf",
    },
    mimetype: "application/pdf",
    jpegThumbnail: await sock.resize("https://via.placeholder.com/320x320", 320, 320),
    caption: "Example Caption",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "Example Button",
                id: "example_id",
            }),
        },
    ],
    hasMediaAttachment: true,
});
```

### Location with Buttons

```javascript
await sock.client(m.chat, {
    location: {
        degreesLatitude: -6.2,
        degreesLongitude: 106.816666,
        name: "Example Location",
    },
    caption: "Example Caption",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "Example Button",
                id: "example_id",
            }),
        },
    ],
    hasMediaAttachment: true,
});
```

### Product with Buttons

```javascript
await sock.client(m.chat, {
    product: {
        productImage: {
            url: "https://via.placeholder.com/800x600?text=Product",
        },
        productId: "example_product_123",
        title: "Example Product",
        description: "Example Description",
        currencyCode: "USD",
        priceAmount1000: "50000",
        retailerId: "example_retailer",
        url: "https://example.com",
        productImageCount: 1,
    },
    businessOwnerJid: "628123456789@s.whatsapp.net",
    caption: "Example Caption",
    title: "Example Title",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    interactiveButtons: [
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "Example Button",
                id: "example_id",
            }),
        },
    ],
    hasMediaAttachment: true,
});
```

---

## 🎠 Carousel Messages

Carousel messages display multiple cards that users can swipe through horizontally.

### Basic Carousel

```javascript
await sock.client(m.chat, {
    text: "Example carousel message",
    title: "Example Carousel",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    cards: [
        {
            image: {
                url: "https://via.placeholder.com/800x600?text=Card+1",
            },
            title: "Example Card 1",
            body: "Example card 1 description",
            footer: "Example Footer 1",
            buttons: [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Example Button 1",
                        id: "example_card_1",
                    }),
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Example URL",
                        url: "https://example.com/1",
                    }),
                },
            ],
        },
        {
            image: {
                url: "https://via.placeholder.com/800x600?text=Card+2",
            },
            title: "Example Card 2",
            body: "Example card 2 description",
            footer: "Example Footer 2",
            buttons: [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Example Button 2",
                        id: "example_card_2",
                    }),
                },
            ],
        },
    ],
});
```

### Video Carousel

```javascript
await sock.client(m.chat, {
    text: "Example video carousel",
    title: "Example Videos",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    cards: [
        {
            video: {
                url: "https://example.com/video1.mp4",
            },
            title: "Example Video 1",
            body: "Example video description",
            footer: "Example Footer",
            buttons: [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Example Play",
                        id: "example_play_1",
                    }),
                },
            ],
        },
        {
            video: {
                url: "https://example.com/video2.mp4",
            },
            title: "Example Video 2",
            body: "Example video description",
            footer: "Example Footer",
            buttons: [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Example Play",
                        id: "example_play_2",
                    }),
                },
            ],
        },
    ],
});
```

### Mixed Media Carousel

```javascript
import { readFile } from "node:fs/promises";

const imageBuffer = await readFile("./images/example.jpg");
const videoBuffer = await readFile("./videos/example.mp4");

await sock.client(m.chat, {
    text: "Example mixed carousel",
    title: "Example Gallery",
    subtitle: "Example Subtitle",
    footer: "Example Footer",
    cards: [
        {
            image: imageBuffer,
            title: "Example Image Card",
            body: "Example description",
            footer: "Example Footer",
            buttons: [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Example Select",
                        id: "example_image",
                    }),
                },
            ],
        },
        {
            video: videoBuffer,
            title: "Example Video Card",
            body: "Example description",
            footer: "Example Footer",
            buttons: [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Example Watch",
                        id: "example_video",
                    }),
                },
            ],
        },
        {
            image: {
                url: "https://via.placeholder.com/800x600?text=Card+3",
            },
            title: "Example URL Card",
            body: "Example description",
            footer: "Example Footer",
            buttons: [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Example Visit",
                        url: "https://example.com",
                    }),
                },
            ],
        },
    ],
});
```

---

## 📷 Album Messages

Album messages send multiple media files in a single message that can be swiped through.

### Image Album

```javascript
await sock.client(m.chat, {
    album: [
        {
            image: {
                url: "https://via.placeholder.com/800x600?text=Image+1",
            },
            caption: "Example Caption 1",
        },
        {
            image: {
                url: "https://via.placeholder.com/800x600?text=Image+2",
            },
            caption: "Example Caption 2",
        },
        {
            image: {
                url: "https://via.placeholder.com/800x600?text=Image+3",
            },
            caption: "Example Caption 3",
        },
    ],
});
```

### Video Album

```javascript
await sock.client(m.chat, {
    album: [
        {
            video: {
                url: "https://example.com/video1.mp4",
            },
            caption: "Example Video 1",
        },
        {
            video: {
                url: "https://example.com/video2.mp4",
            },
            caption: "Example Video 2",
        },
    ],
});
```

### Mixed Media Album

```javascript
await sock.client(m.chat, {
    album: [
        {
            image: {
                url: "https://via.placeholder.com/800x600?text=Image",
            },
            caption: "Example Image",
        },
        {
            video: {
                url: "https://example.com/video.mp4",
            },
            caption: "Example Video",
        },
        {
            image: {
                url: "https://via.placeholder.com/800x600?text=Image+2",
            },
            caption: "Example Image 2",
        },
    ],
});
```

### Album with Buffers

```javascript
import { readFile } from "node:fs/promises";

const image1 = await readFile("./images/photo1.jpg");
const image2 = await readFile("./images/photo2.jpg");
const video1 = await readFile("./videos/clip1.mp4");

await sock.client(m.chat, {
    album: [
        {
            image: image1,
            caption: "Example Local Image 1",
        },
        {
            image: image2,
            caption: "Example Local Image 2",
        },
        {
            video: video1,
            caption: "Example Local Video",
        },
    ],
});
```

---

## 📞 Need Help?

- **WhatsApp Group**: [Join Community](https://chat.whatsapp.com/FtMSX1EsGHTJeynu8QmjpG)
- **GitHub Issues**: [Report Bug](https://github.com/naruyaizumi/liora/issues)
