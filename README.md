# rubberhose-lottie

| [Demo](https://rubberhose-demo.netlify.app/#/about) | [Installation](#installation) | [Usage](#usage) | [API](#api) | [Examples](#examples) |
| --------------------------------------------------- | :---------------------------: | :-------------: | :---------: | :-------------------: |


### Vue component to easily make any Lottie file with Rubberhose fully interactive:

![](https://thumbs.gfycat.com/LiveAnguishedHalcyon-size_restricted.gif)

# Installation

```bash
npm i rubberhose-lottie
```

# Usage

```html
<!-- Inside a .vue file -->
<template>
  <Rubberhose :animation-data="myAnimationFile" />
</template>

<script>
export default {
  components: {
    Rubberhose: require("rubberhose-lottie").default,
  },
  data: () => ({
    myAnimationFile: require("@/assets/someLottieFile.json"),
  })
}
```

# API

## Props

| Property       | Type   | Default | Required |                                                Description |
| :------------- | :----- | :------ | :------- | ---------------------------------------------------------: |
| animation-data | Object | null    | **Yes**  |                         The parsed Lottie JSON file to use |
| controllers    | Array  | null    |          |             Array of slider controls to control reactively |
| draggable      | Array  | null    |          |                  Array of layers which should be draggable |
| clickable      | Array  | null    |          |                  Array of layers which should be clickable |
| locked         | Array  | null    |          | Array of layer names which should have no user interaction |

## Events

> None so far, but will be wanting to add soon

| Event   | Value  |                                               Description |
| :------ | :----- | --------------------------------------------------------: |
| @update | Number | The reactive value of the slider within (includes easing) |

# Examples

[Check out this demo site for live examples.](https://rubberhose-demo.netlify.app/#/about)

The `controllers` prop is an array expecting a `layer`, `name` (of Slider Expression Control on layer), and `value` (numeric):

```html
<template>
  <Rubberhose :animation-data="animationData" :controllers="controllerArray" />
  <Grid style="width: fit-content" column>
    <Input-Scroll
      label="Hose Length"
      v-model="controllers.length.value"
      :step="20"
      :min="1"
    />
  </Grid>
</template>

<script>
  export default {
    data: () => ({
      controllers: {
        length: {
          layer: "control",
          name: "hoseLength",
          value: 700,
        },
    }),
    components: {
      Rubberhose: require("rubberhose-lottie").default,
    },
    computed: {
      // The prop expects an Array, but I'd prefer to keep them as Objects
      // in data above. So we just convert the parent data objects to an Array:
      controllerArray() {
        let temp = [];
        Object.keys(this.controllers).forEach((key) => {
          temp.push(this.controllers[key]);
        });
        return temp;
      },
    }
  }
</script>
```
