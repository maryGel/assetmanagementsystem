


export const dashItems =  (counts) => {

    return [
        { id: 1,
            title: 'Job Orders',
            link: '/Home/jobOrderPage',
            imgSrc: '/dashIcons/jo.png',
            num: counts.joCount || 0,
        },
        { id: 2,
            title: 'Maintenance',
            link: '/Home/maintenance',
            imgSrc: '/dashIcons/mechanic.png',
            num: counts.maintCount,
        },
        { id: 3,
            title: 'Transfers',
            link: '/Home/transfers',
            imgSrc: '/dashIcons/transfer.png',
            num: counts.trCount || 0,
        },
        { id: 4,
            title: 'Borrow/Issue',
            link: '/Home/borrowAndIssue',
            imgSrc: '/dashIcons/issuance.png',
            num: counts.aAcctCount,
        },
        { id: 5,
            title: 'Disposals',
            link: '/Home/disposals',
            imgSrc: '/dashIcons/garbage.png',
            num: counts.adCount,
        },
        { id: 6,
            title: 'Lost Assets',
            link: '/Home/lostAssets',
            imgSrc: '/dashIcons/lost.png',
            num: counts.aLostCount,
        },
    ];

}