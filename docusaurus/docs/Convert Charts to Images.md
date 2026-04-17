Select the whole Chart Codeblock and run the Command "Create image from Chart" to replace it with a Image. You can choose the Quality and Format in the Settings of this Plugin.

<img src="https://media.discordapp.net/attachments/855181471643861002/897811615037136966/charttoimage.gif" referrerpolicy="no-referrer" />

:::tip Canvas Dimensions

The generated image respects the `width` modifier from your chart YAML. If you specify a pixel width (e.g., `width: 800px` or `width: 800`), the image will be rendered at that width. Percentage values (e.g., `width: 80%`) fall back to a default of 600px for image export. The height is automatically calculated at a 2:1 aspect ratio.

:::
