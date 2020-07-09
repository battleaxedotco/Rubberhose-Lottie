# rubberhose-lottie

| [Demo](https://rubberhose-demo.netlify.app/) | [Installation](#installation) | [Usage](#usage) | [API](#api) | [Examples](#examples) |
| -------------------------------------------- | :---------------------------: | :-------------: | :---------: | :-------------------: |


### Vue component to easily make any Lottie file with Rubberhose fully interactive:

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
