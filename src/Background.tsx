import EventEmitter from 'events';
import { FC, useEffect, useRef } from 'react';
import Delaunator from 'delaunator';

export interface IBackgroundProps {
  colorChangeEmitter: EventEmitter;
  initialColor?: [number, number, number];
  pointCount?: number;
}

interface IPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: [number, number, number];
  changeCounter: number;
}

// utils borrowed from https://mapbox.github.io/delaunator
function edgesOfTriangle(t: number) { return [3 * t, 3 * t + 1, 3 * t + 2]; }
function pointsOfTriangle(delaunay: Delaunator<number[]>, t: number) {
    return edgesOfTriangle(t)
        .map(e => delaunay.triangles[e]);
}
function forEachTriangle<T>(points: T[], delaunay: Delaunator<number[]>, callback: (index: number, pts: T[]) => void) {
    for (let t = 0; t < delaunay.triangles.length / 3; t++) {
        callback(t, pointsOfTriangle(delaunay, t).map(p => points[p]));
    }
}

export const Background: FC<IBackgroundProps> = ({
  colorChangeEmitter,
  initialColor = [1, 1, 1],
  pointCount = 500
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // initialize webgl
    if (!canvasRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl');
    if (!gl) {
      return;
    }
    const program = gl.createProgram();
    if (!program) {
      return;
    }
    const vtxShaderSrc = (document.getElementById("2d-vertex-shader") as HTMLScriptElement).text;
    const fragShaderSrc = (document.getElementById("2d-fragment-shader") as HTMLScriptElement).text;
    const vtxShader = gl.createShader(gl.VERTEX_SHADER);
  	const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vtxShader || !fragShader) {
      return;
    }
  	gl.shaderSource(vtxShader, vtxShaderSrc);
  	gl.shaderSource(fragShader, fragShaderSrc);
    gl.compileShader(vtxShader);
  	gl.compileShader(fragShader);
  	gl.attachShader(program, vtxShader);
  	gl.attachShader(program, fragShader);
  	gl.linkProgram(program);
  	gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());

    // bind attributes
    const aPositionLoc = gl.getAttribLocation(program, "a_position");
  	const aColorLoc = gl.getAttribLocation(program, "a_color");
  	gl.enableVertexAttribArray(aPositionLoc);
  	gl.enableVertexAttribArray(aColorLoc);
  	gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, true, 24, 0);
  	gl.vertexAttribPointer(aColorLoc, 4, gl.FLOAT, true, 24, 8);

    // set up state
    let running = true;
    let points: IPoint[] = [];
    let currentColor = [...initialColor];
    let changeCounter = 0;
    let changeProgress = 0;

    function seedPoints() {
      while (points.length < pointCount) {
        points.push({
          x: Math.random() * 4 - 2,
          y: Math.random() * 4 - 2,
          vx: 0,
          vy: 0,
          color: [...currentColor] as [number, number, number],
          changeCounter
        });
      }
    }

    function movePoints() {
      points.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.9;
        p.vy *= 0.9;
      });
    }

    function recolorAndTossPoints() {
      points.forEach(p => {
        if (p.changeCounter >= changeCounter) {
          return;
        }
        const pDistance = Math.sqrt(p.x * p.x + p.y * p.y);
        if (pDistance <= changeProgress) {
          p.changeCounter++;
          p.color = [...currentColor] as [number, number, number];
          p.color[0] += Math.random() * 0.1;
          p.color[1] += Math.random() * 0.1;
          p.color[2] += Math.random() * 0.1;
          p.vx = (Math.random() - 0.5) * 0.02;
          p.vy = (Math.random() - 0.5) * 0.02;
        }
      });
    }

    colorChangeEmitter.on('changeColor', (color: [number, number, number]) => {
      currentColor = color;
      changeCounter++;
      changeProgress = 0;
    });

    function doFrame() {
      if (!running || !gl) {
        return;
      }

      // animate
      changeProgress += 0.1;
      movePoints();
      recolorAndTossPoints();

      // find triangles in our point set
      const rawPointsArr: number[] = [];
      points.forEach(p => rawPointsArr.push(p.x, p.y));
      const delaunay = new Delaunator(rawPointsArr);
      const triangleBuff: number[] = [];
      let triangleBuffLen = 0;
      forEachTriangle<IPoint>(points, delaunay, (_, pts) => {
        const color = pts[0].color;
        pts.forEach(p => triangleBuff.push(
          p.x,
          p.y,
          color[0],
          color[1],
          color[2],
          1
        ));
        triangleBuffLen += 3;
      });

      // render those triangles
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleBuff), gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, triangleBuffLen);

      // kick off next frame
      requestAnimationFrame(doFrame);
    }

    // go
    seedPoints();
    doFrame();

    return () => {
      running = false;
      // TODO: cleanup code for WebGL context
    };
  }, [colorChangeEmitter, initialColor, pointCount]);

  const width = window.innerWidth;
  const height = window.innerHeight;
  return <canvas className='background' ref={canvasRef} width={width} height={height} />;
};
