import { registerOverlay, utils } from "klinecharts";

export interface OrderSegment {
  text: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function registerCustomOverlays() {
  registerOverlay({
    name: "tradingViewOrder",
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    totalStep: 2,
    createPointFigures: ({ overlay, coordinates, bounding }) => {
      if (coordinates.length === 0) return [];

      const data = overlay.extendData as {
        color: string;
        segments: OrderSegment[];
        isDashed?: boolean;
      } | undefined;

      if (!data) return [];

      const y = coordinates[0].y;
      const figures: any[] = [];
      const fontSize = 12;
      const fontFamily = "sans-serif";
      const paddingX = 6;
      const paddingY = 4;
      const gap = -1; // Negative gap to make borders overlap seamlessly like TV

      // Helper to compute line start X and offset
      let currentX = 10;
      let totalWidth = 0;

      // Calculate total width first to know how many segments
      if (data.segments && data.segments.length > 0) {
          for (let i = 0; i < data.segments.length; i++) {
              totalWidth += utils.calcTextWidth(data.segments[i].text, fontSize, "normal", fontFamily) + (paddingX * 2) + gap;
          }
      }

      // 1. Draw the horizontal line from right of the rightmost box to the end of the chart
      figures.push({
        type: "line",
        attrs: {
          coordinates: [
            { x: totalWidth > 0 ? totalWidth + 10 : 0, y },
            { x: bounding.width, y }
          ]
        },
        styles: {
          style: data.isDashed ? "dashed" : "solid",
          color: data.color,
          size: 1,
          dashedValue: data.isDashed ? [4, 4] : undefined
        }
      });

      if (!data.segments || data.segments.length === 0) return figures;

      // 2. Draw segments
      for (let i = 0; i < data.segments.length; i++) {
        const seg = data.segments[i];
        const textWidth = utils.calcTextWidth(seg.text, fontSize, "normal", fontFamily);
        
        figures.push({
          type: "rectText",
          attrs: {
            x: currentX,
            y: y,
            text: seg.text,
            align: "left",
            baseline: "middle"
          },
          styles: {
            style: "stroke_fill",
            color: seg.color,
            size: fontSize,
            family: fontFamily,
            paddingLeft: paddingX,
            paddingRight: paddingX,
            paddingTop: paddingY,
            paddingBottom: paddingY,
            backgroundColor: seg.bgColor,
            borderColor: seg.borderColor,
            borderSize: 1,
            borderRadius: 2
          }
        });

        currentX += textWidth + (paddingX * 2) + gap;
      }

      return figures;
    }
  });

  registerOverlay({
    name: "tradeMarker",
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    totalStep: 2,
    createPointFigures: ({ overlay, coordinates }) => {
      if (coordinates.length === 0) return [];

      const data = overlay.extendData as {
        type: "buy" | "sell";
        text: string;
      } | undefined;

      if (!data) return [];

      const { x, y } = coordinates[0];
      const isBuy = data.type === "buy";
      const color = isBuy ? "#2563eb" : "#dc2626"; // Blue for buy, Red for sell
      const arrowText = isBuy ? "↑" : "↓";

      // Draw the arrow pointing at the price
      const textFigure = {
         type: "text",
         attrs: {
           x: x,
           y: isBuy ? y + 20 : y - 20, // Buy appears below pointing up, Sell appears above pointing down
           text: `${arrowText} ${data.text}`,
           align: "center",
           baseline: isBuy ? "top" : "bottom"
         },
         styles: {
           color: color,
           size: 14,
           weight: "bold",
           family: "sans-serif"
         }
      };

      return [textFigure];
    }
  });
}
