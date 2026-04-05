"use client";
import { useRef, useState, useEffect, useCallback } from "react";

interface SignaturePadProps {
  initialData?: string | null;
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
}

export default function SignaturePad({ initialData, onSave, onClear, width = 400, height = 150 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Load initial signature
  useEffect(() => {
    if (initialData && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        setHasContent(true);
        setIsEmpty(false);
      };
      img.src = initialData;
    }
  }, [initialData, width, height]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setDrawing(true);
    setIsEmpty(false);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#1a1815";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }, [drawing, getPos]);

  const endDraw = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    setHasContent(true);
  }, [drawing]);

  const clear = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    setHasContent(false);
    setIsEmpty(true);
    onClear?.();
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a clean version with transparent background
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;
    tempCtx.drawImage(canvas, 0, 0);

    const dataUrl = tempCanvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div>
      <div style={{
        border: "1.5px solid #d4d0c8",
        borderRadius: 8,
        overflow: "hidden",
        background: "#fff",
        position: "relative",
        touchAction: "none",
      }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {isEmpty && !initialData && (
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            color: "#b8b5af", fontSize: 14, pointerEvents: "none", userSelect: "none",
          }}>
            Hier unterschreiben
          </div>
        )}
        {/* Signature line */}
        <div style={{
          position: "absolute", bottom: "20%", left: "15%", right: "15%",
          borderBottom: "1px solid #d4d0c8", pointerEvents: "none",
        }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={clear} style={{
          padding: "6px 14px", borderRadius: 6, border: "1px solid #d4d0c8",
          background: "#fff", color: "#5c5850", fontSize: 12, cursor: "pointer",
        }}>Löschen</button>
        <button onClick={save} disabled={!hasContent} style={{
          padding: "6px 14px", borderRadius: 6, border: "none",
          background: hasContent ? "#003056" : "#d4d0c8", color: "#fff",
          fontSize: 12, fontWeight: 700, cursor: hasContent ? "pointer" : "not-allowed",
        }}>Unterschrift speichern</button>
      </div>
    </div>
  );
}
