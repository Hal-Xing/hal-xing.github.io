from weasyprint import HTML

html_content = """
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <title>邢 Hal - 个人简历</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; line-height: 1.6; }
        h1, h2 { text-align: center; }
        h1 { font-size: 26px; margin-bottom: 5px; }
        h2 { font-size: 18px; margin-top: 20px; border-bottom: 2px solid #333; padding-bottom: 5px; }
        p { margin: 5px 0; }
        .section { margin-bottom: 20px; }
        strong { color: #333; }
    </style>
</head>
<body>

    <h1>邢 越豪</h1>
    <p>Hal Xing</p>
    
    <h2>教育背景</h2>
    <p>2023 – 2025 东京艺术大学 全球艺术实践（MFA）</p>
    <p>2019 – 2023 东京造形大学 设计系 摄影专业（BA）</p>
    <p>2014 – 2017 加州大学伯克利分校 文理学院（退学）</p>

    <h2>工作与项目经验</h2>
    
    <p><strong>展览与影像制作</strong></p>
    <p>2024 影像与技术支持，GAP 练习展，山手艺术线博物馆，东京</p>
    <p>2023 参展艺术家 & 技术助理，东京造形大学 毕业展，东京</p>
    <p>2021 影像制作，岛巡展，墨田向岛 EXPO，东京</p>

    <p><strong>电影 & 影像制作</strong></p>
    <p>2023 短片《p o e m》导演摄影（DP）& 摄影</p>
    <p>2021, 2022 短片《Beautiful Dove》导演摄影（DP）& 摄影</p>
    <p>2021 短片《Days》 摄影 & 舞蹈编排</p>
    <p>2020 短片《Noise of Fractures》 灯光 & 摄影助理</p>

    <p><strong>网页开发 & 交互设计</strong></p>
    <p>2024 艺术家 Rikki Yang 个人网站 设计与开发</p>
    <p>2022 互动界面编程（© colore design Inc.）</p>
    <p>2020 东京造形大学 在线 CS 节 网站团队负责人 & 首页开发</p>

    <p><strong>教育 & 语言教学</strong></p>
    <p>2023 – 至今 TOEFL 托福讲师，新东方前途塾</p>

    <h2>相关课程</h2>
    <p>博物馆与展览实践</p>
    <p>摄影与影像艺术理论</p>
    <p>美学、西方艺术史与哲学</p>
    <p>声音艺术与媒体装置</p>
    <p>戏剧构作与空间设计</p>

    <h2>技能</h2>
    <p>展览安装与媒体技术（灯光、投影、影像设备搭建）</p>
    <p>DSLR 影像拍摄与剪辑（Sony, Lumix, Canon, Blackmagic；DaVinci Resolve）</p>
    <p>网页 & 互动媒体开发（HTML, CSS, JavaScript）</p>
    <p>精通日语、英语</p>

</body>
</html>
"""

# Generate the PDF
HTML(string=html_content).write_pdf("resume.pdf")

print("PDF 已生成：resume.pdf")