<template>
  <div
    class="rubberhose-container"
    :style="{
      height: height,
      width: width,
    }"
  >
    <div class="rubberhose-animation" />
  </div>
</template>

<script>
import * as lottie from "lottie-web";

export default {
  name: "Rubberhose-Lottie",
  props: {
    animationData: {
      type: Object,
      default: () => {
        return require("./static.json");
      },
    },
    controllers: {
      type: Array,
      default: () => {
        return [];
      },
    },
    draggable: {
      type: Array,
      default: () => {
        return [];
      },
    },
    clickable: {
      type: Array,
      default: () => {
        return [];
      },
    },
    locked: {
      type: Array,
      default: () => {
        return [];
      },
    },
    hidden: {
      type: Array,
      default: () => {
        return [];
      },
    },
    height: {
      type: String,
      default: "",
    },
    width: {
      type: String,
      default: "",
    },
    layer: {
      type: String,
      default: "control",
    },
    debug: {
      type: Boolean,
      default: false,
    },
  },
  data: () => ({
    speed: 1,
    elt: null,
    doneLoading: false,
    animData: null,
    loop: true,
    autoplay: true,
    override: false,
    control: [],
    mousePos: {
      x: 0,
      y: 0,
    },
    lastMousePos: {
      x: 0,
      y: 0,
    },
    compSize: {
      width: 0,
      height: 0,
      x: 0,
      y: 0,
    },
    lottieSize: {
      width: 0,
      height: 0,
    },
    lottieElt: null,
    dragElements: [],
    draggableLayers: [],
    clickableLayers: [],
    joystickLayers: [],
    controlPoints: [],
    realHoses: [],
    activeItem: null,
    isDragging: false,
  }),
  async mounted() {
    require("./lottie_api.js");
    this.elt = this.$el.children[0];
    await this.init();
    window.addEventListener("resize", this.adjustScreenSize);
  },
  watch: {
    // This can be much better.
    stringMousePos(value) {
      if (this.activeItem && !this.override) {
        if (this.activeItem.parentJoystick) this.moveActiveElementJoystick();
        else this.getRelativeMouseMovement();
      }
    },
    animationData(val) {
      this.animData.destroy();
      this.flushAllEvents();
      if (val) {
        this.init();
        this.adjustScreenSize();
      }
    },
    activeItem(val) {
      if (val) {
        val.lastPosition.x = val.position.x;
        val.lastPosition.y = val.position.y;
      } else if (this.debug) {
        console.log("ACTIVE ITEM IS:", val);
      }
    },
    isDragging(val) {
      if (val) {
        this.lastMousePos.x = 0;
        this.lastMousePos.y = 0;
      }
    },
  },
  computed: {
    stringMousePos() {
      return JSON.stringify(this.mousePos);
    },
    rigControllers() {
      return [].concat(this.controlPoints, this.joystickLayers);
    },
    totalDraggableLayers() {
      return [].concat(this.draggableLayers, this.rigControllers);
    },
  },
  methods: {
    // This works well! Calculates the movement of cursor relative to AE comp, adds to layer position.
    getRelativeMouseMovement() {
      if (this.lastMousePos.x == 0 && this.lastMousePos.y == 0) {
        this.lastMousePos.x = this.mousePos.x;
        this.lastMousePos.y = this.mousePos.y;
      }
      let tempX = this.mousePos.x - this.lastMousePos.x;
      let tempY = this.mousePos.y - this.lastMousePos.y;
      this.activeItem.position.x = this.activeItem.lastPosition.x + tempX;
      this.activeItem.position.y = this.activeItem.lastPosition.y + tempY;
      if (this.debug) console.log(`[${tempX}, ${tempY}]`);
    },
    async init() {
      try {
        // Inject classes and unhide all rubberhose layers
        let animData = this.prepAnimationFile(this.animationData);
        // Instantiate Lottie with treated version of JSON
        this.animData = this.buildAnimation(animData);
        // Create Lottie API for interaction
        this.animAPI = lottie_api.createAnimationApi(this.animData);
        // Inject interaction to Lottie API
        this.buildDynamicCallbacks();
        this.buildControllerCallbacks();
        // Adjust screen and comp size to ensure coordinates are relative
        this.adjustScreenSize();
        this.adjustLottieSize();
        // Force file to play so Lottie API can function
        this.animData.play();
        return Promise.resolve(true);
      } catch (err) {
        return Promise.reject(err);
      }
    },
    resetPositions() {
      this.totalDraggableLayers.forEach((layer) => {
        layer.position.x = layer.firstPosition.x;
        layer.position.y = layer.firstPosition.y;
      });
    },
    // Still has some bugs for certain Joysticks. Should probably find a way to make this relative as well
    moveActiveElementJoystick() {
      let min = -200,
        max = 200;
      let parentOffsetX =
        this.activeItem.parentJoystick.scale.x *
        this.activeItem.parentJoystick.width;
      let parentOffsetY =
        this.activeItem.parentJoystick.scale.y *
        this.activeItem.parentJoystick.height;
      let modifier = 1 / this.activeItem.parentJoystick.scale.x;
      let x =
        (this.mousePos.x - this.activeItem.parentJoystick.position.x) *
        modifier;
      let y =
        (this.mousePos.y - this.activeItem.parentJoystick.position.y) *
        modifier;
      x = x <= max && x >= min ? x : x < min ? min : max;
      y = y <= max && y >= min ? y : y < min ? min : max;
      this.activeItem.position.x = x;
      this.activeItem.position.y = y;
    },
    // Some of this is entirely redundant, may want to clean up
    prepAnimationFile(file) {
      let hosesFound = [],
        total = [],
        temp = [];
      this.draggableLayers = [];
      this.controlPoints = [];
      this.clickableLayers = [];
      this.realHoses = [];
      this.joystickLayers = [];
      if (this.clickable.length) {
        this.clickable.forEach((clickItem) => {
          let layer = file.layers.find((item) => {
            return item.nm == clickItem.layer || clickItem.name;
          });
          let thisClickable = {};
          if (layer) {
            let oldClass;
            if (layer.cl) oldClass = layer.cl;
            let eltClass = `rubberhose-clickable-${layer.nm
              .replace(/\:\:/, "-")
              .replace(/\s/gm, "-")
              .toLowerCase()}`;
            layer["cl"] = `${eltClass}${
              this.locked.includes(layer.nm) ? "-locked" : ""
            }${this.hidden.includes(layer.nm) ? "-hidden" : ""}`;
            thisClickable = {
              name: clickItem.layer || clickItem.name,
              class: eltClass,
              position: {
                x: layer.ks.p.k[0],
                y: layer.ks.p.k[1],
              },
              lastPosition: {
                x: layer.ks.p.k[0],
                y: layer.ks.p.k[1],
              },
              offset: {},
              transform: {},
              anchor: {
                x: layer.ks.a.k[0],
                y: layer.ks.a.k[1],
              },
            };
            if (oldClass) thisClickable["extraClass"] = oldClass;
            this.clickableLayers.push(thisClickable);
          }
        });
      }

      if (this.draggable.length) {
        this.draggable.forEach((dragItem) => {
          let layerName;
          if (/string/i.test(typeof dragItem)) layerName = dragItem;
          else layerName = dragItem.layer || dragItem.name;

          let thisDraggable = {};
          let layer = file.layers.find((item) => {
            return item.nm == layerName;
          });
          if (layer) {
            // if (this.hidden.includes(layer.nm)) layer.hd = true;
            let oldClass;
            if (layer.cl) oldClass = layer.cl;
            let eltClass = `rubberhose-draggable-${layer.nm
              .replace(/\:\:/, "-")
              .replace(/\s/gm, "-")
              .toLowerCase()}`;
            layer["cl"] = `${eltClass}${
              this.locked.includes(layer.nm) ? "-locked" : ""
            }${this.hidden.includes(layer.nm) ? "-hidden" : ""}`;
            thisDraggable = {
              name: layerName,
              class: eltClass,
              anchor: {
                x: layer.ks.a.k[0],
                y: layer.ks.a.k[1],
              },
              position: {
                x: layer.ks.p.k[0],
                y: layer.ks.p.k[1],
              },
              lastPosition: {
                x: layer.ks.p.k[0],
                y: layer.ks.p.k[1],
              },
              firstPosition: {
                x: layer.ks.p.k[0],
                y: layer.ks.p.k[1],
              },
            };
            if (oldClass) thisDraggable["extraClass"] = oldClass;
            // if (layerName == "RelativeAnchor")
            //   thisDraggable.position = this.getInitialOffsetPosition(
            //     thisDraggable
            //   );
            this.draggableLayers.push(thisDraggable);
          }
        });
      }
      file.layers.forEach((layer) => {
        if (/\:\:/.test(layer.nm) && !/autoflop/i.test(layer.nm)) {
          let hoseName = layer.nm.replace(/\:\:.*/, "");
          let eltClass = `rubberhose-controller-${layer.nm
            .replace(/\:\:/, "-")
            .replace(/\s/gm, "-")
            .toLowerCase()}`;
          layer["cl"] = `${eltClass}${
            this.locked.includes(layer.nm) ? "-locked" : ""
          }${this.hidden.includes(layer.nm) ? "-hidden" : ""}`;
          layer["hd"] = false;
          let shape = layer.shapes.find((item) => {
            return item.nm == "Control Point";
          });
          temp.push({
            name: layer.nm,
            matches: new RegExp(`^${hoseName}`),
            position: {
              x: layer.ks.p.k[0],
              y: layer.ks.p.k[1],
            },
            firstPosition: {
              x: layer.ks.p.k[0],
              y: layer.ks.p.k[1],
            },
            lastPosition: {
              x: layer.ks.p.k[0],
              y: layer.ks.p.k[1],
            },
            anchor: {
              x: layer.ks.a.k[0],
              y: layer.ks.a.k[1],
            },
            parent: hoseName,
            class: eltClass,
            sibling: "",
          });

          if (shape)
            shape.it[1]["cl"] = hoseName.toLowerCase().replace(/\s/gm, "-");
          if (!hosesFound.includes(hoseName)) hosesFound.push(hoseName);
        } else {
          if (
            layer.ef &&
            layer.ef.length &&
            layer.ef[0].nm == "joystickLimit"
          ) {
            let eltClass = `joystick-controller-${layer.nm
              .replace(/\s/gm, "-")
              .toLowerCase()}`;
            layer["cl"] = `${eltClass}${
              this.locked.includes(layer.nm) ? "-locked" : ""
            }${this.hidden.includes(layer.nm) ? "-hidden" : ""}`;
            // if (this.hidden.includes(layer.nm)) layer.hd = true;
            // else
            layer["hd"] = false;
            let joystickController = {
              name: layer.nm,
              class: eltClass,
              position: {
                x: layer.ks.p.k[0],
                y: layer.ks.p.k[1],
              },
              anchor: {
                x: layer.ks.a.k[0],
                y: layer.ks.a.k[1],
              },
              firstPosition: {
                x: layer.ks.p.k[0],
                y: layer.ks.p.k[1],
              },
              lastPosition: {
                x: layer.ks.p.k[0],
                y: layer.ks.p.k[1],
              },
              offset: {},
              transform: {},
              parentJoystick: {
                position: {
                  x: 0,
                  y: 0,
                },
                scale: {
                  x: 1,
                  y: 1,
                },
                width: 400,
                height: 400,
              },
            };
            this.joystickLayers.push(joystickController);
          }
        }
      });

      // Do extra logic for Joysticks to match controllers to their bounds
      if (this.joystickLayers.length) {
        file.layers.forEach((layer) => {
          if (
            layer.shapes &&
            layer.shapes.length &&
            layer.shapes[0].it &&
            layer.shapes[0].it.length &&
            layer.shapes[0].it[0].s &&
            layer.shapes[0].it[0].s.x &&
            /joystickLimit/.test(layer.shapes[0].it[0].s.x)
          ) {
            layer["cl"] = `joystick-bounds${
              this.locked.includes(layer.nm) ? "-locked" : ""
            }`;
            if (this.hidden.includes(layer.nm)) layer.hd = true;
            else layer["hd"] = false;
            let expression = layer.shapes[0].it[0].s.x;
            let controllerMatch = expression.match(
              /thisComp\.layer\('([^']*)'\)\('ADBE\sEffect\sParade'\)/
            );
            if (controllerMatch.length) {
              let matchingID = controllerMatch[1];
              let sibling = this.joystickLayers.find((joystick) => {
                return joystick.name == matchingID;
              });
              if (sibling) {
                sibling.parentJoystick.position.x = layer.ks.p.k[0];
                sibling.parentJoystick.position.y = layer.ks.p.k[1];
                sibling.parentJoystick.scale.x = layer.ks.s.k[0] / 100;
                sibling.parentJoystick.scale.y = layer.ks.s.k[1] / 100;
                sibling.parentJoystick.width = 400;
                sibling.parentJoystick.height = 400;
              } else {
                console.log("NO SIBLING FOR:", matchingID);
              }
            }
          }
        });
      }

      // Do extra logic for Rubberhose to determine matching hose, points, and siblings:
      temp.forEach((hose) => {
        let sibling = file.layers.find((layer) => {
          return hose.matches.test(layer.nm) && layer.nm !== hose.name;
        });
        if (sibling) hose.sibling = sibling.nm;
        this.controlPoints.push(hose);
      });
      hosesFound.forEach((hose) => {
        let targetLayer = file.layers.find((layer) => {
          return new RegExp(`^${hose}$`).test(layer.nm);
        });
        let rubberhose = {
          name: targetLayer.nm,
          class: targetLayer.nm.toLowerCase().replace(/\s/gm, "-"),
        };
        let pointA = this.controlPoints.find((item) => {
          return new RegExp(rubberhose.name).test(item.name);
        });
        let pointB = this.controlPoints.find((item) => {
          return item.name == pointA.sibling;
        });
        rubberhose["A"] = pointA;
        rubberhose["B"] = pointB;
        // rubberhose = this.updateHose(rubberhose);
        this.realHoses.push(rubberhose);
      });

      return file;
    },

    findDistance(a, b) {
      return Math.hypot(
        a.position.x - b.position.x,
        a.position.y - b.position.y
      );
    },
    updateHose(rubberhose) {
      let hasDistance = this.animationData.layers.find((item) => {
        return (
          (item.nm == rubberhose.A.name || item.nm == rubberhose.B.name) &&
          item.ef &&
          item.ef.length
        );
      });
      rubberhose["distance"] = this.findDistance(rubberhose.A, rubberhose.B);
      rubberhose["length"] = hasDistance.ef[0].ef.find((prop) => {
        return prop.nm == "Hose Length";
      }).v.k;
      rubberhose["isExtended"] = rubberhose.distance >= rubberhose.length;
      return rubberhose;
    },
    adjustMousePos(coords) {
      let result = this.getCoordinatesRelativeToLottie(
        coords.clientX,
        coords.clientY
      );
      this.mousePos.x = result.x;
      this.mousePos.y = result.y;
    },
    buildDynamicCallbacks() {
      const self = this;
      this.$nextTick(() => {
        self.clickableLayers.forEach((layer) => {
          layer["elt"] = this.identifyLayerElement(layer);
          if (layer.elt && !this.locked.includes(layer.name)) {
            layer.elt.addEventListener("click", (evt) => {
              let target = self.clickable.find((item) => {
                return item.layer == layer.name;
              });
              if (target && target.callback) target.callback();
            });
          }
        });
        self.totalDraggableLayers.forEach((layer) => {
          layer["elt"] = this.identifyLayerElement(layer);
          if (layer.elt && !this.locked.includes(layer.name)) {
            layer.elt.addEventListener("mousedown", (evt) => {
              self.isDragging = true;
              self.activeItem = layer;
              window.addEventListener("mousemove", self.adjustMousePos);
            });
            layer.elt.addEventListener("touchstart", (evt) => {
              document.documentElement.style.overflow = "hidden";
              self.activeItem = layer;
              self.override = true;
            });
            this.animAPI.addValueCallback(
              this.animAPI.getKeyPath(`${layer.name},Transform,Position`),
              (currentVal) => {
                return [
                  layer.position.x + layer.anchor.x,
                  layer.position.y + layer.anchor.y,
                ];
              }
            );
          } else {
            console.log(`${layer.name} was locked or had no matching elt`);
          }
        });
        window.addEventListener("mouseup", (evt) => {
          self.activeItem = null;
          self.isDragging = false;
          window.removeEventListener("mousemove", self.adjustMousePos);
        });
        window.addEventListener("touchend", (evt) => {
          self.activeItem = null;
          document.documentElement.style.overflow = "auto";
        });
        window.addEventListener("touchmove", (evt) => {
          evt.preventDefault();
          self.override = false;
          let coords = evt.targetTouches[0];
          let result = this.getCoordinatesRelativeToLottie(
            coords.clientX,
            coords.clientY
          );
          self.mousePos.x = result.x;
          self.mousePos.y = result.y;
        });
      });
    },
    buildControllerCallbacks() {
      this.controllers.forEach((controller) => {
        this.animAPI.addValueCallback(
          this.animAPI.getKeyPath(
            `${controller.layer},Effects,${controller.name},0`
          ),
          (currentVal) => {
            return controller.value;
          }
        );
      });
    },
    flushAllEvents() {
      const self = this;
      this.reset();
      self.totalDraggableLayers.forEach((layer) => {
        if (layer.elt && !this.locked.includes(layer.name)) {
          layer.elt.removeEventListener("mousedown", (evt) => {
            self.activeItem = layer;
            window.addEventListener("mousemove", self.adjustMousePos);
          });
          layer.elt.removeEventListener("touchstart", (evt) => {
            document.documentElement.style.overflow = "hidden";
            self.activeItem = layer;
            self.override = true;
          });
        }
      });
      window.removeEventListener("mouseup", (evt) => {
        self.activeItem = null;
        window.removeEventListener("mousemove", self.adjustMousePos);
      });
      window.removeEventListener("touchend", (evt) => {
        self.activeItem = null;
        document.documentElement.style.overflow = "auto";
      });
      window.removeEventListener("touchmove", (evt) => {
        evt.preventDefault();
        self.override = false;
        let coords = evt.targetTouches[0];
        let result = this.getCoordinatesRelativeToLottie(
          coords.clientX,
          coords.clientY
        );
        self.mousePos.x = result.x;
        self.mousePos.y = result.y;
      });
    },

    /**
     * Currently only works with layer.Transform's anchor offset.
     * Doesn't take into account shape or Contents transforms.
     */
    identifyLayerElement(layer) {
      let possibleElts = document.querySelectorAll(`.${layer.class}`);
      let boundsX1, boundsX2, boundsY1, boundsY2;
      if (possibleElts.length < 2) return possibleElts[0];
      let nodeList = [];
      let match = null;
      for (let i = 0; i < possibleElts.length; i++)
        nodeList.push(possibleElts[i]);
      nodeList.forEach((path) => {
        let position = path.getBoundingClientRect();
        let x = Math.round(position.width / 2 + position.x);
        let y = Math.round(position.height / 2 + position.y);
        let realPos = this.getCoordinatesRelativeToLottie(x, y);
        if (layer.position.x == realPos.x && layer.position.y == realPos.y)
          match = path;

        boundsX1 = layer.position.x + layer.anchor.x * -1 + position.width / 2;
        boundsX2 = layer.position.x + layer.anchor.x * -1 - position.width / 2;
        boundsY1 = layer.position.y + layer.anchor.y * -1 + position.height / 2;
        boundsY2 = layer.position.y + layer.anchor.x * -1 - position.height / 2;
        if (
          boundsX1 >= realPos.x &&
          boundsX2 <= realPos.x &&
          boundsY1 >= realPos.y &&
          boundsY2 <= realPos.y
        ) {
          match = path;
        }
      });
      if (!match && this.debug) {
        console.log(`${layer.name} had no match:`);
        console.log(layer);
        console.log(
          `[${boundsX1} - ${boundsX2}, ${boundsY1} - ${boundsY2}]`,
          `[${layer.position.x}, ${layer.position.y}]`
        );
      }
      return match;
    },

    // Transposes absolute screen mouse coordinates to the AE equivalent inside Lottie container:
    getCoordinatesRelativeToLottie(x, y) {
      if (arguments.length < 2 && !/number/i.test(typeof arguments[0]))
        (x = x[0]), (y = x[1]);
      let insidePos = {
        x: Math.round(x - this.compSize.x),
        y: Math.round(y - this.compSize.y),
      };
      return {
        x: Math.round(
          insidePos.x * (this.lottieSize.width / this.compSize.width)
        ),
        y: Math.round(
          insidePos.y * (this.lottieSize.height / this.compSize.height)
        ),
      };
    },
    reset() {
      this.mousePos.x = 0;
      this.mousePos.y = 0;
    },
    adjustScreenSize() {
      if (!this.lottieElt) this.lottieElt = this.elt.children[0];
      let boundingBox = this.lottieElt.getBoundingClientRect();
      this.compSize.x = boundingBox.x;
      this.compSize.y = boundingBox.y;
      this.compSize.width = boundingBox.width;
      this.compSize.height = boundingBox.height;
    },
    adjustLottieSize() {
      this.lottieSize.width = this.animationData.w;
      this.lottieSize.height = this.animationData.h;
    },
    buildAnimation(anim = null) {
      if (!anim) anim = this.animationData;
      return lottie.loadAnimation({
        wrapper: this.elt,
        animType: "svg",
        loop: this.loop,
        prerender: true,
        autoplay: this.autoplay,
        animationData: anim,
      });
    },
  },
};
</script>

<style>
.rubberhose-container svg {
  width: 100%;
}
.rubberhose-animation {
  width: 100%;
}
.rubberhose-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  flex-direction: column;
  user-select: none;
  cursor: default;
}

[class^="rubberhose-clickable"]:not([class$="-locked"]) {
  cursor: pointer;
}
[class^="joystick-controller"]:not([class$="-locked"]),
[class^="rubberhose-controller"]:not([class$="-locked"]),
[class^="rubberhose-draggable"]:not([class$="-locked"]) {
  cursor: move;
}
[class$="-locked"] {
  cursor: not-allowed;
}

[class$="-hidden"] {
  opacity: 0;
}

.rh-bg {
  fill: transparent;
}
</style>
