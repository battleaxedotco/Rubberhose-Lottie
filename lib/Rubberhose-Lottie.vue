<template>
  <div
    class="rubberhose-container"
    :style="{
      height: height,
      width: width,
    }"
  >
    <div class="rubberhose-animation"></div>
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
    compSize: {
      width: 0,
      height: 0,
    },
    lottieSize: {
      width: 0,
      height: 0,
    },
    lottieElt: null,
    dragElements: [],
    draggableLayers: [],
    clickableLayers: [],
    controlPoints: [],
    realHoses: [],
    activeItem: null,
  }),
  mounted() {
    require("./lottie_api.js");
    this.elt = this.$el.children[0];
    this.init();
    window.addEventListener("resize", this.adjustScreenSize);
  },
  watch: {
    stringMousePos(value) {
      if (this.activeItem && !this.override) {
        this.activeItem.position.x = this.mousePos.x + this.activeItem.anchor.x;
        this.activeItem.position.y = this.mousePos.y + this.activeItem.anchor.y;
        if (this.activeItem.parent) {
          let parent = this.realHoses.find((hose) => {
            return hose.name == this.activeItem.parent;
          });
          if (parent) this.updateHose(parent);
        }
      }
    },
    activeItem(val) {
      if (this.debug) {
        console.log("ACTIVE ITEM IS CURRENTLY:", val);
        console.log(
          `Anchor: ${val.anchor.x}, Pos: ${val.position.x} == ${this.mousePos.x}`
        );
      }
    },
  },
  computed: {
    stringMousePos() {
      return JSON.stringify(this.mousePos);
    },
    totalDraggableLayers() {
      return [].concat(this.draggableLayers, this.controlPoints);
    },
  },
  methods: {
    init() {
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
    },
    prepAnimationFile(file) {
      let hosesFound = [],
        total = [],
        temp = [];
      this.draggableLayers = [];
      this.controlPoints = [];
      this.clickableLayers = [];
      this.realHoses = [];
      if (this.clickable.length) {
        this.clickable.forEach((clickItem) => {
          let layer = file.layers.find((item) => {
            return item.nm == clickItem.layer || clickItem.name;
          });
          let thisClickable = {};
          if (layer) {
            layer["cl"] = `rubberhose-clickable${
              this.locked.includes(layer.nm) ? "-locked" : ""
            }`;
            thisClickable = {
              name: clickItem.layer || clickItem.name,
              class: "rubberhose-clickable",
              position: {
                x: layer.ks.p.k[0],
                y: layer.ks.p.k[1],
              },
              anchor: {
                x: layer.ks.a.k[0],
                y: layer.ks.a.k[1],
              },
            };
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
            layer["cl"] = `rubberhose-draggable${
              this.locked.includes(layer.nm) ? "-locked" : ""
            }`;
            thisDraggable = {
              name: layerName,
              class: "rubberhose-draggable",
              position: {
                x: layer.ks.p.k[0],
                y: layer.ks.p.k[1],
              },
              anchor: {
                x: layer.ks.a.k[0],
                y: layer.ks.a.k[1],
              },
            };
            this.draggableLayers.push(thisDraggable);
          }
        });
      }
      file.layers.forEach((layer) => {
        if (/\:\:/.test(layer.nm)) {
          let hoseName = layer.nm.replace(/\:\:.*/, "");
          layer["cl"] = `rubberhose-controller${
            this.locked.includes(layer.nm) ? "-locked" : ""
          }`;
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
            anchor: {
              x: layer.ks.a.k[0],
              y: layer.ks.a.k[1],
            },
            parent: hoseName,
            class: hoseName.toLowerCase().replace(/\s/gm, "-"),
            sibling: "",
          });

          if (shape)
            shape.it[1]["cl"] = hoseName.toLowerCase().replace(/\s/gm, "-");
          if (!hosesFound.includes(hoseName)) hosesFound.push(hoseName);
        }
      });
      temp.forEach((hose) => {
        let sibling = file.layers.find((layer) => {
          return hose.matches.test(layer.nm) && layer.nm !== hose.name;
        });
        if (sibling) hose.sibling = sibling.nm;
        this.controlPoints.push(hose);
      });

      // this.controlPoints = temp;
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
        rubberhose = this.updateHose(rubberhose);
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
              self.activeItem = layer;
              window.addEventListener("mousemove", self.adjustMousePos);
            });
            layer.elt.addEventListener("touchstart", (evt) => {
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
          }
        });
        window.addEventListener("mouseup", (evt) => {
          self.activeItem = null;
          window.removeEventListener("mousemove", self.adjustMousePos);
        });
        window.addEventListener("touchend", (evt) => {
          self.activeItem = null;
        });
        window.addEventListener("touchmove", (evt) => {
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

    /**
     * Currently only works with layer.Transform's anchor offset.
     * Doesn't take into account shape or Contents transforms.
     */
    identifyLayerElement(layer) {
      let possibleElts = document.querySelectorAll(`.${layer.class}`);
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

        let boundsX1 =
          layer.position.x + layer.anchor.x * -1 + position.width / 2;
        let boundsX2 =
          layer.position.x + layer.anchor.x * -1 - position.width / 2;
        let boundsY1 =
          layer.position.y + layer.anchor.y * -1 + position.height / 2;
        let boundsY2 =
          layer.position.y + layer.anchor.x * -1 - position.height / 2;
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

    buildControllerCallbacks() {
      this.controllers.forEach((controller) => {
        console.log("Building callback...", controller);
        console.log(`${controller.layer},Effects,${controller.name},0`);
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
    getCoordinatesRelativeToLottie(x, y) {
      if (arguments.length < 2 && !/number/i.test(typeof arguments[0]))
        (x = x[0]), (y = x[1]);
      let bbox = this.lottieElt.getBoundingClientRect();
      let insidePos = {
        x: Math.round(x - bbox.x),
        y: Math.round(y - bbox.y),
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

    adjustScreenSize() {
      if (!this.lottieElt) this.lottieElt = this.elt.children[0];
      let boundingBox = this.lottieElt.getBoundingClientRect();
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
  max-width: 1000px;
}

.rubberhose-controller,
.rubberhose-draggable {
  cursor: move;
}

.rubberhose-clickable {
  cursor: pointer;
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

[class$="-locked"] {
  cursor: not-allowed;
}

.rubberhose-animation {
  width: 100%;
}
.rh-bg {
  fill: transparent;
}
</style>
