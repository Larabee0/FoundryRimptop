export class DoubleSliderController{
    minGap = 0.0;
    sliderOne;
    sliderTwo;

    lowerValue;
    upperValue;

    onAction;
    onInstant

    _onRender(container){
        this.sliderOne = container.querySelector("[id=slider-1]");
        this.sliderTwo = container.querySelector("[id=slider-2]");
        this.lowerValue = parseFloat(this.sliderOne.value);
        this.upperValue = parseFloat(this.sliderTwo.value);
        this.sliderOne.addEventListener("input",this.slideOne.bind(this));
        this.sliderTwo.addEventListener("input",this.slideTwo.bind(this));

        if(this.onAction){
            this.sliderOne.addEventListener("change",this.onAction.bind(this));
            this.sliderTwo.addEventListener("change",this.onAction.bind(this));
        }
    }

    slideOne(event) {
        event.preventDefault();
        if (parseFloat(this.sliderTwo.value) - parseFloat(this.sliderOne.value) <= this.minGap) {
            this.sliderOne.value = parseFloat(this.sliderTwo.value) - this.minGap;
        }
        this.lowerValue = parseFloat(this.sliderOne.value);
        this.upperValue = parseFloat(this.sliderTwo.value);

        if(this.onInstant){
            this.onInstant();
        }
    }

    slideTwo(event) {
        event.preventDefault();
        if (parseFloat(this.sliderTwo.value) - parseFloat(this.sliderOne.value) <= this.minGap) {
            this.sliderTwo.value = parseFloat(this.sliderOne.value) + this.minGap;
        }
        this.lowerValue = parseFloat(this.sliderOne.value);
        this.upperValue = parseFloat(this.sliderTwo.value);

        if(this.onInstant){
            this.onInstant();
        }
    }
}