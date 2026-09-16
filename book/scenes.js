/**
 * Мини-3D-сцены для разделов лендинга «Тело помнит всё».
 * Каждая сцена — визуальная метафора своего раздела, без внешних моделей.
 *
 * Производительность:
 *  - three.js подгружается только когда первая сцена подходит к экрану;
 *  - рисуются только сцены, видимые в окне (IntersectionObserver);
 *  - плотность пикселей ограничена 1.5;
 *  - при «уменьшить движение» каждая сцена рисуется одним статичным кадром.
 */

const ORANGE = 0xf26522;
const CREAM = 0xffeee2;
const DIM = 0x3a3431;
const ICE = 0xbfe3ff;

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ————————————————————————————————————————— общие помощники

function edges(THREE, geometry, color, opacity) {
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  );
}

function lights(THREE, scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(ORANGE, 0.9);
  rim.position.set(-4, -1, -3);
  scene.add(rim);
}

const smooth = (x) => x * x * (3 - 2 * x);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// ————————————————————————————————————————— 01. тело помнит состояние

function pulse(THREE, scene) {
  const shell = edges(THREE, new THREE.IcosahedronGeometry(1.55, 1), CREAM, 0.22);
  scene.add(shell);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 40, 40),
    new THREE.MeshBasicMaterial({ color: ORANGE })
  );
  scene.add(core);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 32, 32),
    new THREE.MeshBasicMaterial({
      color: ORANGE, transparent: true, opacity: 0.18,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  scene.add(halo);

  // точки состояния, медленно вращаются вокруг
  const n = 140, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 1.9 + Math.random() * 0.6;
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(b) * Math.cos(a);
    pos[i * 3 + 1] = r * Math.cos(b) * 0.6;
    pos[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(g, new THREE.PointsMaterial({
    color: CREAM, size: 0.03, transparent: true, opacity: 0.55,
  }));
  scene.add(dust);

  // удар сердца: «тук» и чуть слабее «тук»
  const beat = (t) => {
    const p = t % 1.1;
    return Math.exp(-(((p - 0.05) / 0.05) ** 2)) + 0.6 * Math.exp(-(((p - 0.3) / 0.05) ** 2));
  };

  return (t) => {
    const b = beat(t);
    core.scale.setScalar(1 + b * 0.18);
    halo.scale.setScalar(1 + b * 0.55);
    halo.material.opacity = 0.12 + b * 0.22;
    shell.rotation.y = t * 0.18;
    shell.rotation.x = Math.sin(t * 0.3) * 0.15;
    shell.scale.setScalar(1 + b * 0.03);
    dust.rotation.y = -t * 0.08;
  };
}

// ————————————————————————————————————————— 02. пропадают слова и план

function network(THREE, scene) {
  const N = 72;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(2 * Math.random() - 1);
    const r = 1.0 + Math.random() * 0.75;
    pts.push(new THREE.Vector3(
      r * Math.sin(b) * Math.cos(a),
      r * Math.cos(b) * 0.75,
      r * Math.sin(b) * Math.sin(a)
    ));
  }
  // «планирование» — передняя часть сети, «реакция» — задняя
  const isPlan = pts.map((p) => p.x > 0.1);

  const nodePos = new Float32Array(N * 3);
  const nodeCol = new Float32Array(N * 3);
  pts.forEach((p, i) => nodePos.set([p.x, p.y, p.z], i * 3));
  const ng = new THREE.BufferGeometry();
  ng.setAttribute("position", new THREE.BufferAttribute(nodePos, 3));
  ng.setAttribute("color", new THREE.BufferAttribute(nodeCol, 3));
  const nodes = new THREE.Points(ng, new THREE.PointsMaterial({
    size: 0.12, vertexColors: true, transparent: true,
  }));

  const links = [];
  for (let i = 0; i < N; i++)
    for (let j = i + 1; j < N; j++)
      if (pts[i].distanceTo(pts[j]) < 0.66) links.push([i, j]);

  const lp = new Float32Array(links.length * 6);
  const lc = new Float32Array(links.length * 6);
  links.forEach(([i, j], k) => {
    lp.set([pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z], k * 6);
  });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.BufferAttribute(lp, 3));
  lg.setAttribute("color", new THREE.BufferAttribute(lc, 3));
  const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.9,
  }));

  const group = new THREE.Group();
  group.add(lines, nodes);
  scene.add(group);

  const cOn = new THREE.Color(CREAM), cHot = new THREE.Color(ORANGE), cOff = new THREE.Color(0x4a3f38);
  const tmp = new THREE.Color();

  const colorFor = (plan, threat) => {
    // при угрозе план гаснет, реакция разгорается
    if (plan) return tmp.copy(cOn).lerp(cOff, threat);
    return tmp.copy(cOff).lerp(cHot, 0.3 + threat * 0.7);
  };

  return (t) => {
    const threat = smooth(clamp01((Math.sin(t * 0.9) + 1) / 2 * 1.3 - 0.15));
    for (let i = 0; i < N; i++) {
      const c = colorFor(isPlan[i], threat);
      nodeCol.set([c.r, c.g, c.b], i * 3);
    }
    links.forEach(([i, j], k) => {
      const a = colorFor(isPlan[i], threat); const ar = a.r, ag = a.g, ab = a.b;
      const b = colorFor(isPlan[j], threat);
      lc.set([ar * 0.75, ag * 0.75, ab * 0.75, b.r * 0.75, b.g * 0.75, b.b * 0.75], k * 6);
    });
    ng.attributes.color.needsUpdate = true;
    lg.attributes.color.needsUpdate = true;
    group.rotation.y = t * 0.15;
    group.rotation.x = Math.sin(t * 0.25) * 0.1;
  };
}

// ————————————————————————————————————————— 03. бить, бежать, замереть

function freeze(THREE, scene) {
  lights(THREE, scene);
  const mat = () => new THREE.MeshStandardMaterial({
    color: ORANGE, roughness: 0.45, metalness: 0.15, flatShading: true,
  });

  const fight = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), mat());
  const flight = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1, 5), mat());
  const still = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), mat());
  fight.position.x = -1.75;
  flight.rotation.z = -Math.PI / 2;
  still.position.x = 1.75;
  scene.add(fight, flight, still);

  const frost = edges(THREE, new THREE.IcosahedronGeometry(0.66, 1), ICE, 0);
  frost.position.x = 1.75;
  scene.add(frost);

  const cHot = new THREE.Color(ORANGE), cIce = new THREE.Color(ICE);
  let spin = 0, last = 0;

  return (t) => {
    const dt = Math.min(0.05, t - last); last = t;

    // бить — резкие рывки
    fight.rotation.x = t * 2.2 + Math.sin(t * 17) * 0.12;
    fight.rotation.y = t * 1.7;
    fight.position.y = Math.abs(Math.sin(t * 5)) * 0.12;

    // бежать — туда-обратно
    flight.position.x = Math.sin(t * 2.4) * 0.38;
    flight.rotation.x = t * 1.5;

    // замереть — вращение затухает, фигура покрывается холодом, потом оттаивает
    const p = (t % 6) / 6;
    const cold = p < 0.3 ? 0 : p < 0.55 ? smooth((p - 0.3) / 0.25) : p < 0.85 ? 1 : 1 - smooth((p - 0.85) / 0.15);
    spin += dt * 1.8 * (1 - cold);
    still.rotation.y = spin;
    still.rotation.x = spin * 0.6;
    still.material.color.copy(cHot).lerp(cIce, cold);
    frost.material.opacity = cold * 0.8;
    frost.rotation.copy(still.rotation);
    frost.scale.setScalar(1 + cold * 0.05);
  };
}

// ————————————————————————————————————————— 04. снизу вверх

function layers(THREE, scene) {
  const ys = [-1.1, -0.37, 0.37, 1.1];
  const plates = ys.map((y) => {
    const g = new THREE.BoxGeometry(2.8, 0.04, 1.7);
    const plate = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      color: ORANGE, transparent: true, opacity: 0.05, depthWrite: false,
    }));
    const rim = edges(THREE, g, CREAM, 0.28);
    plate.position.y = rim.position.y = y;
    scene.add(plate, rim);
    return { plate, rim, y };
  });

  const n = 160, pos = new Float32Array(n * 3), speed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 2.6;
    pos[i * 3 + 1] = -1.3 + Math.random() * 2.7;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    speed[i] = 0.35 + Math.random() * 0.5;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const sparks = new THREE.Points(g, new THREE.PointsMaterial({
    color: ORANGE, size: 0.05, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(sparks);

  let last = 0;
  return (t) => {
    const dt = Math.min(0.05, t - last); last = t;
    for (let i = 0; i < n; i++) {
      let y = pos[i * 3 + 1] + speed[i] * dt;
      if (y > 1.45) y = -1.3;
      pos[i * 3 + 1] = y;
    }
    g.attributes.position.needsUpdate = true;

    // волна поднимается от нижнего слоя к верхнему
    const front = ((t * 0.9) % 3.2) - 1.5;
    plates.forEach(({ plate, rim, y }) => {
      const glow = Math.exp(-(((y - front) / 0.3) ** 2));
      plate.material.opacity = 0.05 + glow * 0.35;
      rim.material.opacity = 0.22 + glow * 0.6;
    });
    scene.rotation.y = Math.sin(t * 0.3) * 0.35;
  };
}

// ————————————————————————————————————————— 05. замечать, что внутри

function sense(THREE, scene) {
  const body = new THREE.Group();
  body.add(edges(THREE, new THREE.CapsuleGeometry(0.72, 1.3, 6, 14), CREAM, 0.2));
  const head = edges(THREE, new THREE.SphereGeometry(0.38, 12, 8), CREAM, 0.2);
  head.position.y = 1.55;
  body.add(head);
  body.position.y = -0.3;
  scene.add(body);

  // точки, где тело подаёт сигналы: горло, плечи, грудь, живот, руки
  const spots = [
    [0, 1.05, 0.25], [-0.55, 0.85, 0.1], [0.55, 0.85, 0.1],
    [0, 0.55, 0.45], [-0.2, 0.1, 0.5], [0.2, -0.2, 0.5],
    [0, -0.55, 0.4], [-0.62, 0.1, 0.2], [0.62, 0.1, 0.2],
  ];
  const probes = spots.map(([x, y, z]) => {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 16),
      new THREE.MeshBasicMaterial({ color: DIM })
    );
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.13, 32),
      new THREE.MeshBasicMaterial({
        color: ORANGE, transparent: true, opacity: 0,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    dot.position.set(x, y, z);
    ring.position.set(x, y, z);
    body.add(dot, ring);
    return { dot, ring };
  });

  const cDim = new THREE.Color(DIM), cHot = new THREE.Color(ORANGE);
  return (t, camera) => {
    const period = 0.75;
    probes.forEach(({ dot, ring }, i) => {
      // каждая точка вспыхивает по очереди
      const local = ((t - i * period) % (probes.length * period) + probes.length * period)
        % (probes.length * period);
      const k = local < 1.2 ? 1 - local / 1.2 : 0;
      dot.material.color.copy(cDim).lerp(cHot, k);
      dot.scale.setScalar(1 + k * 0.8);
      ring.material.opacity = k * 0.9;
      ring.scale.setScalar(1 + (1 - k) * 2.2 * (k > 0 ? 1 : 0));
      ring.quaternion.copy(camera.quaternion);
    });
    body.rotation.y = Math.sin(t * 0.4) * 0.5;
  };
}

// ————————————————————————————————————————— 06. рядом люди

function people(THREE, scene) {
  lights(THREE, scene);
  const me = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 2),
    new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.35, metalness: 0.1 })
  );
  scene.add(me);

  const K = 5;
  const others = [], links = [];
  for (let i = 0; i < K; i++) {
    const s = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.2, 1),
      new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.6 })
    );
    scene.add(s);
    others.push(s);
    const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const l = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: ORANGE, transparent: true, opacity: 0 }));
    scene.add(l);
    links.push(l);
  }

  return (t) => {
    // цикл: люди подходят и связываются — центр успокаивается
    const p = (t % 8) / 8;
    const bond = p < 0.2 ? 0 : p < 0.45 ? smooth((p - 0.2) / 0.25) : p < 0.85 ? 1 : 1 - smooth((p - 0.85) / 0.15);
    const radius = 2.5 - bond * 0.95;

    const jitter = (1 - bond) * 0.09;
    me.position.set(
      Math.sin(t * 13) * jitter,
      Math.cos(t * 11) * jitter,
      Math.sin(t * 7) * jitter
    );
    me.rotation.y = t * 0.4;

    others.forEach((s, i) => {
      const a = t * 0.35 + (i / K) * Math.PI * 2;
      s.position.set(Math.cos(a) * radius, Math.sin(a * 1.3 + i) * 0.35, Math.sin(a) * radius * 0.55);
      const arr = links[i].geometry.attributes.position.array;
      arr[0] = me.position.x; arr[1] = me.position.y; arr[2] = me.position.z;
      arr[3] = s.position.x; arr[4] = s.position.y; arr[5] = s.position.z;
      links[i].geometry.attributes.position.needsUpdate = true;
      links[i].material.opacity = bond * 0.7;
    });
  };
}

// ————————————————————————————————————————— менеджер сцен

const FACTORIES = { pulse, network, freeze, layers, sense, people };

async function boot() {
  const boxes = [...document.querySelectorAll(".scene[data-scene]")];
  if (!boxes.length) return;

  let THREE;
  try {
    THREE = await import("../vendor/three.module.min.js");
  } catch (e) {
    boxes.forEach((b) => b.remove());
    return;
  }

  const live = [];

  for (const box of boxes) {
    const make = FACTORIES[box.dataset.scene];
    if (!make) { box.remove(); continue; }

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch (e) {
      box.remove();   // WebGL недоступен — просто убираем сцену, текст остаётся
      continue;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    box.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 50);
    camera.position.set(0, 0.35, 6.4);
    camera.lookAt(0, 0, 0);
    const update = make(THREE, scene);

    const item = { box, renderer, scene, camera, update, visible: false };
    const fit = () => {
      const w = box.clientWidth, h = box.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // на узких экранах отодвигаем камеру, чтобы сцена не обрезалась
      camera.position.z = w / h < 1.5 ? 7.6 : 6.4;
      camera.updateProjectionMatrix();
      if (reduceMotion) draw(item, 2.2);
    };
    new ResizeObserver(fit).observe(box);
    fit();
    live.push(item);
  }

  function draw(item, t) {
    item.update(t, item.camera);
    item.renderer.render(item.scene, item.camera);
  }

  if (reduceMotion) {
    live.forEach((it) => draw(it, 2.2));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const it = live.find((x) => x.box === e.target);
      if (it) it.visible = e.isIntersecting;
    });
  }, { rootMargin: "80px 0px" });
  live.forEach((it) => io.observe(it.box));

  const start = performance.now();
  const loop = (now) => {
    const t = (now - start) / 1000;
    for (const it of live) if (it.visible) draw(it, t);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

// three.js грузим, только когда первая сцена подходит к экрану
const first = document.querySelector(".scene[data-scene]");
if (first && "IntersectionObserver" in window) {
  const wake = new IntersectionObserver((entries, obs) => {
    if (entries.some((e) => e.isIntersecting)) { obs.disconnect(); boot(); }
  }, { rootMargin: "400px 0px" });
  wake.observe(first);
} else {
  boot();
}
