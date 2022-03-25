import { RgbaColor } from "@int/geotoolkit/util/RgbaColor";
import {ChangeDetectionStrategy, ElementRef, Input, Output, ViewChild, AfterViewInit, Component, EventEmitter, OnInit} from '@angular/core';

@Component({
    selector: 'app-color-picker',
    templateUrl: './color-picker.component.html',
    styleUrls: ['./color-picker.component.css'],
    changeDetection:ChangeDetectionStrategy.OnPush
})
export class ColorPickerComponent implements OnInit, AfterViewInit {

    @ViewChild('colorPicker', { static: true }) colorPicker: ElementRef;
    @ViewChild('colorPickerButton', { static: true }) colorPickerButton: ElementRef;

    @Input('initialColor') initialColor: string;
    @Input('isDisabled') isDisabled = false;

    @Output() onApply: EventEmitter<string> = new EventEmitter<string>();

    public dialog: any;

    ngAfterViewInit(): void {
        let c = new RgbaColor(this.initialColor);
        this.dialog = (<any>$(this.colorPicker.nativeElement)).colorpicker({
            okOnEnter: true,
            revert: true,
            showNoneButton: true,
            inline: false,
            alpha: true,
            modal:true,
            position: {
                my: 'center',
                at: 'center',
                of: window
            },

            colorFormat: ['RGBA'],
            color:c.toRgbaString(),
            init: this.onInit.bind(this),
            select: this.onSelect.bind(this),
            stop: this.onStop.bind(this),
            close: this.onClose.bind(this),
            ok: this.onOk.bind(this),
            open: this.onOpen.bind(this),
            cancel: this.onCancel.bind(this)
        });
    }

    toggleDialog(e) {
        e.stopPropagation();
        let c = new RgbaColor(this.initialColor);
        this.dialog.colorpicker('open');
    }

    public updateButtonColor(colorString) {
        $(this.colorPicker.nativeElement).val(colorString);
    }

    public onInit(event, color) {
        this.updateButtonColor(color.formatted);
    }

    public onSelect(event, color) {
        this.updateButtonColor(color.formatted);
        this.onOk(event, color);
    }

    public onStop(event, color) {
    }

    public onClose(event, color) {

    }

    public onOk(event, color) {
        this.updateButtonColor(color.formatted);
        let s: string = color.formatted;
        if (this.onApply)
            this.onApply.emit(s);
    }

    public onOpen(event, color) {
        let c = new RgbaColor(this.initialColor);
        this.dialog.color = c.toRgbaString();
        this.updateButtonColor(c.toRgbaString());
    }

    public onCancel(event, color) {
        color.formatted = this.initialColor;
        this.updateButtonColor(color.formatted);
    }

    constructor() {
    }

    ngOnInit() {
    }

    toHex(alpha, rs?, gs?, bs?) {
        let a, r, g, b;
        if(alpha instanceof RgbaColor) {
            a = alpha.getAlpha().toString(16);
            r = alpha.getRed().toString(16);
            b = alpha.getBlue().toString(16);
            g = alpha.getGreen().toString(16);
        } else {
            a = alpha.toString(16);
            r = rs.toString(16);
            g = gs.toString(16);
            b = bs.toString(16);
        }
        if (a.length === 1) a = '0' + a;
        if (r.length === 1) r = '0' + r;
        if (g.length === 1) g = '0' + g;
        if (b.length === 1) b = '0' + b;
        return '#' + a + r + g + b;
    };
}
