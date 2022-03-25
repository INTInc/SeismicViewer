import { RgbaColor } from "@int/geotoolkit/util/RgbaColor";
let randNumOld;

export class Utils {

  public static getRandomInt(min: number, max: number) : number {
    const randNum = Math.floor(Math.random() * (max - min + 1)) + min;
    if (randNum === randNumOld) {
      Utils.getRandomInt(min, max);
    }
    randNumOld = randNum;
    return randNum;
  };

  public static getRandomRgbColor(): string {
    const r = Utils.getRandomInt(0, 254);
    const g = Utils.getRandomInt(0, 254);
    const b = Utils.getRandomInt(0, 254);
    return 'rgb(' + r + ', ' + g + ', ' + b + ')';
  };

  public static getRandomRgbaColor = function (color?): string {
    if (color != null) {
      color = RgbaColor.fromObject(color);
    }
    const r = color != null ? color.getRed() : Utils.getRandomInt(0, 254);
    const g = color != null ? color.getGreen() : Utils.getRandomInt(0, 254);
    const b = color != null ? color.getBlue() : Utils.getRandomInt(0, 254);
    const a = Utils.getRandomInt(0, 10) > 5 ? 0.3 : 0.7;
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
  };

  public static getColor = function (colorName): string {
    const color = colorName.toLowerCase();

    switch (color) {
      case 'gray':
        return '#a5a5a5';

      case 'grey':
        return '#a5a5a5';

      case 'lightgray':
        return '#ededed';

      case 'lightgrey':
        return '#ededed';

      case 'orange':
        return '#ed7d31';

      case 'lightorange':
        return '#f9d6bc';

      case 'green':
        return '#70ad47';

      case 'blue':
        return '#5b9bd5';

      case 'lightblue':
        return '#d5e5f4';

      case 'darkblue':
        return '#4472c4';

      case 'yellow':
        return '#ffc000';

      case 'darkgray':
        return '#6b6b6b';

      case 'darkgrey':
        return '#6b6b6b';

      case 'black':
        return '#383838';

      default:
        return colorName;
    }
  };
}
