class DeviceHub {

    constructor(shockJs, hubData) {
        this.shockJs = shockJs;
        this.id = hubData.id;
        this.name = hubData.name;
        this.createdOn = hubData.createdOn;
    }

    fetchShockers() {
        return this.shockJs.fetchShockers(this);
    }

}

export default DeviceHub;