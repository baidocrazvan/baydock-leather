import path from "path";
import { fileURLToPath } from "url";
import MiniCssExtractPlugin from "mini-css-extract-plugin";

const isProduction = process.env.NODE_ENV === "production";
// Convert import.meta.url to __dirname equivalent
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  entry: "./src/main.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "public/dist"),
  },
  devtool: isProduction ? false : "source-map",
  mode: isProduction ? "production" : "development",
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.scss$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "styles.css",
    }),
  ],
};
