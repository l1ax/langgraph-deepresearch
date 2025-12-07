'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { GroupEvent } from '@/stores';
import { EventRendererProps } from '@/services';

/**
 * GroupEventRenderer 渲染器组件
 * GroupEvent 是一个容器事件，用于聚合子事件，本身不显示内容
 */
export const GroupEventRenderer = observer(
  ({ data: _data, status: _status, roleName: _roleName, className: _className }: EventRendererProps<GroupEvent.IData>) => {
    // GroupEvent 作为容器，不渲染任何内容
    return null;
  }
);

GroupEventRenderer.displayName = 'GroupEventRenderer';

