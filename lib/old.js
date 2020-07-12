export default {
  methods: {
    // REDUNDANT! Not needed with relative mouse coordinates
    getInitialOffsetPosition(layer) {
      let temp = {
        x: 0,
        y: 0,
      };
      if (this.debug) {
        console.log("GETTING INITIAL POS FOR:", layer.name);
        console.log("OFFSET:", layer.offset.position.x, layer.offset.anchor.x);
        console.log(
          "TRANSFORM:",
          layer.transform.position.x,
          layer.transform.anchor.x
        );
      }
      temp.x =
        layer.offset.position.x -
        layer.offset.anchor.x +
        (layer.transform.position.x + layer.transform.anchor.x);
      temp.y =
        layer.offset.position.y -
        layer.offset.anchor.y +
        (layer.transform.position.y + layer.transform.anchor.y);
      // console.log(temp.x, temp.y);
      return temp;
    },
    // REDUNDANT! Not needed with relative mouse coordinates
    getFullParentChain(target, transform = null) {
      if (!target.parent) return null;
      else {
        // console.log("SEARCHING FOR:", target.nm, transform ? true : false);
        let parent = this.animationData.layers.find((layer) => {
          return layer.ind == target.parent;
        });
        transform = transform
          ? this.multiplyTransform(transform, target, parent)
          : this.getTransformData(parent);
        if (parent.parent) {
          transform = this.getFullParentChain(parent, transform);
        }
        // console.log(`PARENT OF ${target.nm} IS ${parent.nm}`);
      }
      return transform;
    },
    getTransformData(layer) {
      let temp = {
        scale: {},
        position: {},
        anchor: {},
      };
      temp["position"]["x"] = layer.ks.p.k[0];
      temp["position"]["y"] = layer.ks.p.k[1];
      temp["scale"]["x"] = layer.ks.s.k[0] / 100;
      temp["scale"]["y"] = layer.ks.s.k[1] / 100;
      temp["anchor"]["x"] = layer.ks.a.k[0];
      temp["anchor"]["y"] = layer.ks.a.k[1];
      return temp;
    },
    multiplyTransform(transform, child, parent) {
      let parentData = this.getTransformData(parent);
      Object.keys(transform).forEach((key) => {
        Object.keys(transform[key]).forEach((prop) => {
          if (/position|anchor/.test(key))
            transform[key][prop] = transform[key][prop] + parentData[key][prop];
          else if (/scale/.test(key))
            transform[key][prop] = transform[key][prop] * parentData[key][prop];
        });
      });
      return transform;
    },
  },
};
